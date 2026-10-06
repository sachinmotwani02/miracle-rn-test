import React, { useRef, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font } from '../theme';
import {
  DialPanel as Panel,
  DialRow,
  decimals,
  dialsSnapshot,
  fireAction,
  getStoreVersion,
  listPanels,
  resetDials,
  setDial,
  snap,
  subscribe,
} from './dials';

const ACCENT = '#5AC8FA';
const THUMB = 16;

type Clipboard = { writeText(text: string): Promise<void> };

/**
 * Floating control panel for every `useDials` in the app. Mount it once at the root in dev
 * builds: a "Dials" chip sits top right and opens the panel. Drag a slider to tune, tap a
 * changed value to reset it, Copy to print the values and put them on the clipboard (web) or
 * open the share sheet (iOS, Android).
 */
export function DialPanel() {
  useSyncExternalStore(subscribe, getStoreVersion);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const panels = listPanels();
  if (!panels.length) return null;

  const copy = async (name: string) => {
    const json = dialsSnapshot(name);
    console.log(`[dials] ${name}\n${json}`);
    let notice = 'Logged to console';
    try {
      const clipboard = (globalThis as { navigator?: { clipboard?: Clipboard } }).navigator?.clipboard;
      if (Platform.OS === 'web' && clipboard) {
        await clipboard.writeText(json);
        notice = 'Copied';
      } else if (Platform.OS !== 'web') {
        // No clipboard module in the app; the share sheet has Copy, AirDrop and Messages.
        await Share.share({ message: json });
        notice = 'Shared';
      }
    } catch {}
    setNotice(notice);
    setTimeout(() => setNotice(null), 1600);
  };

  if (!open) {
    return (
      <Pressable accessibilityRole="button" style={[styles.chip, { top: insets.top + 8 }]} onPress={() => setOpen(true)} hitSlop={8}>
        <Text style={styles.chipText}>Dials</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { top: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Dials</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Close dials" onPress={() => setOpen(false)} hitSlop={10}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.body} scrollEnabled={!dragging} showsVerticalScrollIndicator={false}>
        {panels.map(panel => (
          <View key={panel.name} style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelName}>{panel.name}</Text>
              <Button label="Copy" onPress={() => copy(panel.name)} />
              <Button label="Reset" onPress={() => resetDials(panel.name)} />
            </View>
            <Rows panel={panel} onDrag={setDragging} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Rows in config order; neighbouring actions share one line of buttons. */
function Rows({ panel, onDrag }: { panel: Panel; onDrag: (dragging: boolean) => void }) {
  const out: React.ReactNode[] = [];
  let actions: Extract<DialRow, { kind: 'action' }>[] = [];
  const flush = () => {
    if (!actions.length) return;
    out.push(
      <View key={`actions:${actions[0].path}`} style={[styles.actions, { marginLeft: actions[0].depth * 10 }]}>
        {actions.map(a => (
          <Button key={a.path} label={a.label} onPress={() => fireAction(panel.name, a.path)} filled />
        ))}
      </View>,
    );
    actions = [];
  };
  for (const row of panel.rows) {
    if (row.kind === 'action') {
      actions.push(row);
      continue;
    }
    flush();
    const indent = { marginLeft: row.depth * 10 };
    if (row.kind === 'folder') {
      out.push(
        <Text key={row.path} style={[styles.folder, indent]}>
          {row.label}
        </Text>,
      );
    } else if (row.kind === 'toggle') {
      out.push(
        <View key={row.path} style={[styles.toggleRow, indent]}>
          <Text style={styles.label}>{row.label}</Text>
          <Switch
            value={panel.values[row.path] as boolean}
            onValueChange={v => setDial(panel.name, row.path, v)}
            trackColor={{ true: ACCENT, false: 'rgba(255,255,255,0.2)' }}
          />
        </View>,
      );
    } else {
      out.push(<SliderRow key={row.path} panel={panel.name} row={row} value={panel.values[row.path] as number} onDrag={onDrag} style={indent} />);
    }
  }
  flush();
  return <>{out}</>;
}

function SliderRow({
  panel,
  row,
  value,
  onDrag,
  style,
}: {
  panel: string;
  row: Extract<DialRow, { kind: 'slider' }>;
  value: number;
  onDrag: (dragging: boolean) => void;
  style: object;
}) {
  const changed = value !== row.def;
  return (
    <View style={[styles.sliderRow, style]}>
      <View style={styles.sliderHead}>
        <Text style={styles.label}>{row.label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={changed ? `Reset ${row.label}` : undefined}
          disabled={!changed}
          onPress={() => resetDials(panel, row.path)}
          hitSlop={8}
        >
          <Text style={[styles.value, changed && styles.changed]}>
            {value.toFixed(decimals(row.step))}
            {changed ? '  ↺' : ''}
          </Text>
        </Pressable>
      </View>
      <Slider row={row} value={value} onChange={v => setDial(panel, row.path, v)} onDrag={onDrag} />
    </View>
  );
}

/** Drag anywhere on the track. Children ignore touches so the track keeps the responder. */
function Slider({
  row,
  value,
  onChange,
  onDrag,
}: {
  row: Extract<DialRow, { kind: 'slider' }>;
  value: number;
  onChange: (value: number) => void;
  onDrag: (dragging: boolean) => void;
}) {
  const [width, setWidth] = useState(0);
  const trackLeft = useRef(0);
  const span = row.max - row.min || 1;
  const t = (value - row.min) / span;
  const tDefault = (row.def - row.min) / span;
  const fromPageX = (pageX: number) => {
    if (width) onChange(snap(row.min + ((pageX - trackLeft.current) / width) * span, row.min, row.max, row.step));
  };
  return (
    <View
      style={styles.track}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={e => {
        trackLeft.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        onDrag(true);
        fromPageX(e.nativeEvent.pageX);
      }}
      onResponderMove={e => fromPageX(e.nativeEvent.pageX)}
      onResponderRelease={() => onDrag(false)}
      onResponderTerminate={() => onDrag(false)}
    >
      <View style={styles.rail}>
        <View style={[styles.railFill, { width: `${t * 100}%` }]} />
      </View>
      <View style={[styles.tick, { left: tDefault * width - 1 }]} />
      <View style={[styles.thumb, { left: t * width - THUMB / 2 }]} />
    </View>
  );
}

function Button({ label, onPress, filled }: { label: string; onPress: () => void; filled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, filled && styles.buttonFilled, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, filled && styles.buttonTextFilled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(18,20,24,0.85)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipText: { ...font('600'), fontSize: 12, color: '#FFFFFF' },
  card: {
    position: 'absolute',
    right: 12,
    width: 300,
    maxWidth: '94%',
    maxHeight: '58%',
    borderRadius: 16,
    backgroundColor: 'rgba(18,20,24,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 8 },
  title: { ...font('700'), fontSize: 14, color: '#FFFFFF', flex: 1 },
  notice: { ...font('600'), fontSize: 11, color: ACCENT },
  close: { ...font('600'), fontSize: 20, lineHeight: 22, color: 'rgba(255,255,255,0.7)' },
  body: { flexGrow: 0 },
  panel: { paddingHorizontal: 14, paddingBottom: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  panelName: { ...font('700'), fontSize: 12, color: 'rgba(255,255,255,0.55)', flex: 1, textTransform: 'uppercase', letterSpacing: 0.6 },
  folder: { ...font('700'), fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 10, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.6 },
  label: { ...font('600'), fontSize: 13, color: 'rgba(255,255,255,0.88)' },
  value: { ...font('600'), fontSize: 12, color: 'rgba(255,255,255,0.55)', fontVariant: ['tabular-nums'] },
  changed: { color: ACCENT },
  sliderRow: { marginTop: 6 },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  track: { height: 26, justifyContent: 'center' },
  rail: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', pointerEvents: 'none' },
  railFill: { height: 4, backgroundColor: ACCENT },
  tick: { position: 'absolute', top: 8, width: 2, height: 10, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.35)', pointerEvents: 'none' },
  thumb: {
    position: 'absolute',
    top: (26 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'none',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  buttonFilled: { backgroundColor: ACCENT, borderColor: ACCENT },
  buttonText: { ...font('600'), fontSize: 12, color: '#FFFFFF' },
  buttonTextFilled: { color: '#0B1A24' },
  pressed: { opacity: 0.6 },
});
