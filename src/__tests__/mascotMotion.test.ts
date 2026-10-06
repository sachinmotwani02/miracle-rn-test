import {
  BREATH,
  RARE_AFTER,
  SILK,
  SPARKLE,
  SPARKLE_MS,
  TRAIL,
  TURN,
  breathCurve,
  clamp,
  dizzyOffset,
  randomBetween,
  silkBand,
  silkSpan,
  sparkle,
  starPath,
  stripPaths,
  tapAction,
  trailPath,
  turnPose,
  wrap01,
} from '../utils/mascotMotion';

const coords = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const xsOf = (d: string) => coords(d).filter((_, i) => i % 2 === 0);
const ysOf = (d: string) => coords(d).filter((_, i) => i % 2 === 1);
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
/** Both depth halves of a ribbon, leaving out an empty half's "M0 0" placeholder. */
const both = (p: { front: string; back: string }) => [p.front, p.back].filter(d => d !== 'M0 0').join(' ');

describe('tapAction', () => {
  const MAX = 3;

  it('turns three times, then plays the rare spin on the fourth tap', () => {
    expect(RARE_AFTER).toBe(3);
    expect(tapAction(0, true, 0, MAX)).toBe('turn');
    expect(tapAction(1, true, 0, MAX)).toBe('turn');
    expect(tapAction(2, true, 0, MAX)).toBe('turn');
    expect(tapAction(3, true, 0, MAX)).toBe('rare');
    expect(tapAction(3, true, 1, MAX)).toBe('rare');
  });

  it('saves the rare spin for a tap once the ghost has landed, so a fast burst just stacks turns', () => {
    expect(tapAction(3, false, 1, MAX)).toBe('turn');
    expect(tapAction(4, false, MAX, MAX)).toBe('ignore');
    expect(tapAction(4, true, MAX, MAX)).toBe('rare');
  });

  it('stacks plain turns up to the burst limit', () => {
    expect(tapAction(0, false, MAX - 1, MAX)).toBe('turn');
    expect(tapAction(0, false, MAX, MAX)).toBe('ignore');
    expect(tapAction(0, true, MAX, MAX)).toBe('ignore');
  });
});

describe('stripPaths', () => {
  const line = (front: (i: number) => boolean) =>
    Array.from({ length: 6 }, (_, i) => ({ x: i * 4, y: 10, w: 1, front: front(i) }));

  it('builds one closed ribbon for points all on one side', () => {
    const p = stripPaths(line(() => true));
    expect(p.back).toBe('M0 0');
    expect(p.front.startsWith('M')).toBe(true);
    expect(p.front.endsWith('Z')).toBe(true);
    for (const y of ysOf(p.front)) expect(Math.abs(y - 10)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('splits where the ribbon passes from the front of the ghost to behind it', () => {
    const p = stripPaths(line(i => i < 3));
    expect(p.front).not.toBe('M0 0');
    expect(p.back).not.toBe('M0 0');
  });
});

describe('silkBand', () => {
  const cx = 40;
  const cy = 40;
  // Averaged over a full turn of the swirl, so the loops' up-and-down wobble cancels out.
  const bandYs = (band: number, unravel = 0) =>
    Array.from({ length: 36 }, (_, k) => ysOf(both(silkBand(band, k * 10, 400, unravel, cx, cy)))).flat();

  it('winds the ribbon round the cloud, climbing from its tail to its head', () => {
    expect(mean(bandYs(0))).toBeGreaterThan(mean(bandYs(SILK.bands - 1)) + SILK.climb / 2);
    for (let band = 0; band < SILK.bands; band++) {
      const p = silkBand(band, 30, 400, 0, cx, cy);
      for (const x of xsOf(both(p))) expect(Math.abs(x - cx)).toBeLessThanOrEqual(SILK.radius + SILK.width);
    }
  });

  it('lifts off and stretches upward as it unravels', () => {
    expect(mean(bandYs(SILK.bands - 1, 1))).toBeLessThan(mean(bandYs(SILK.bands - 1, 0)) - 10);
  });

  it('wraps further round the faster the swirl runs, within limits', () => {
    expect(silkSpan(0)).toBe(SILK.minSpan);
    expect(silkSpan(800)).toBeGreaterThan(silkSpan(200));
    expect(silkSpan(1e6)).toBe(SILK.maxSpan);
  });
});

describe('sparkle', () => {
  const cx = 40;
  const cy = 40;

  it('pops each twinkle in turn and is gone when the burst ends', () => {
    expect(sparkle(0, 0, 0, cx, cy).opacity).toBe(0);
    const peak0 = SPARKLE.delay + SPARKLE.life / 2;
    expect(sparkle(0, peak0, 0, cx, cy).scale).toBeCloseTo(SPARKLE.size, 6);
    expect(sparkle(1, peak0 - SPARKLE.life / 2 + 1, 0, cx, cy).opacity).toBe(0); // the second one has not started yet
    for (let i = 0; i < SPARKLE.count; i++) expect(sparkle(i, SPARKLE_MS + 1, 0, cx, cy).opacity).toBe(0);
  });

  it('stays round the cloud, inside the nav bar, rising as it fades', () => {
    for (let i = 0; i < SPARKLE.count; i++) {
      for (let ms = 0; ms <= SPARKLE_MS; ms += 10) {
        const s = sparkle(i, ms, 123, cx, cy);
        if (s.opacity === 0) continue;
        expect(Math.abs(s.x - cx)).toBeLessThanOrEqual(SPARKLE.rx + 1e-9);
        expect(Math.abs(s.y - cy)).toBeLessThanOrEqual(SPARKLE.ry + SPARKLE.rise + 1e-9);
      }
    }
    const early = sparkle(0, SPARKLE.delay + 10, 0, cx, cy);
    const late = sparkle(0, SPARKLE.delay + SPARKLE.life - 10, 0, cx, cy);
    expect(late.y).toBeLessThan(early.y);
  });
});

describe('starPath', () => {
  it('draws a four-point star centred on the point, or nothing at zero size', () => {
    expect(starPath(10, 20, 0, 0)).toBe('M0 0');
    const d = starPath(10, 20, 3, 30);
    expect(coords(d)).toHaveLength(16);
    expect(mean(xsOf(d))).toBeCloseTo(10, 6);
    expect(mean(ysOf(d))).toBeCloseTo(20, 6);
    for (let i = 0; i < 8; i++) expect(Math.hypot(xsOf(d)[i] - 10, ysOf(d)[i] - 20)).toBeLessThanOrEqual(3 + 0.01);
  });
});

describe('trailPath', () => {
  const ring = { cy: 20, rx: 20, ry: 3 };
  const cx = 32;
  const coords = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = (d: string) => coords(d).filter((_, i) => i % 2 === 0);
  const ys = (d: string) => coords(d).filter((_, i) => i % 2 === 1);
  const ringPoint = (deg: number) => {
    const t = (deg * Math.PI) / 180;
    return [cx + ring.rx * Math.sin(t), ring.cy + ring.ry * Math.cos(t)];
  };

  it('draws nothing until the head pulls ahead of the tail', () => {
    expect(trailPath(10, 10, ring, cx)).toBe('M0 0');
    expect(trailPath(5, 20, ring, cx)).toBe('M0 0');
  });

  it('runs from a sharp tail on the ring to a head further round it', () => {
    const d = trailPath(90, 30, ring, cx);
    const [x0, y0] = coords(d);
    const [tx, ty] = ringPoint(30);
    expect(x0).toBeCloseTo(tx, 1);
    expect(y0).toBeCloseTo(ty, 1);
    // Turning right moves the head right of the tail across the front of the ring.
    expect(Math.max(...xs(d))).toBeGreaterThan(ringPoint(85)[0]);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('never draws more than the longest trail', () => {
    expect(trailPath(300, 0, ring, cx)).toBe(trailPath(300, 300 - TRAIL.maxArc, ring, cx));
  });

  it('stays on the ring, within the ribbon width', () => {
    const d = trailPath(400, 290, ring, cx);
    const pad = TRAIL.width;
    for (const x of xs(d)) expect(Math.abs(x - cx)).toBeLessThanOrEqual(ring.rx + pad);
    for (const y of ys(d)) expect(Math.abs(y - ring.cy)).toBeLessThanOrEqual(ring.ry + pad);
  });
});

describe('turnPose', () => {
  // The ghost's face sits a little right of the cloud's centre.
  const face = 0.1;

  it('faces the viewer at rest and after a full turn', () => {
    for (const deg of [0, 360, 720]) {
      const pose = turnPose(deg, face);
      expect(pose.width).toBeCloseTo(1, 6);
      expect(pose.faceX).toBeCloseTo(face, 6);
      expect(pose.faceScale).toBeGreaterThan(0.99);
    }
  });

  it('narrows to its depth side-on instead of collapsing like a flat card', () => {
    expect(turnPose(90, face).width).toBeCloseTo(TURN.depth, 6);
    for (let deg = 0; deg <= 360; deg += 5) {
      expect(turnPose(deg, face).width).toBeGreaterThanOrEqual(TURN.depth - 1e-9);
    }
  });

  it('slides the face around the side and hides it while facing away', () => {
    expect(turnPose(45, face).faceX).toBeGreaterThan(turnPose(0, face).faceX);
    expect(turnPose(45, face).faceScale).toBeLessThan(turnPose(0, face).faceScale);
    for (let deg = 95; deg <= 265; deg += 5) {
      expect(turnPose(deg, face).faceScale).toBe(0);
    }
    expect(turnPose(315, face).faceX).toBeLessThan(face);
    expect(turnPose(315, face).faceScale).toBeGreaterThan(0.5);
  });

  it('keeps the face inside the silhouette', () => {
    for (let deg = 0; deg <= 360; deg += 1) {
      const pose = turnPose(deg, face);
      if (pose.faceScale > 0) expect(Math.abs(pose.faceX)).toBeLessThanOrEqual(pose.width + 1e-9);
    }
  });
});

describe('breathCurve', () => {
  const exhaleEnd = BREATH.inhale + BREATH.exhale;

  it('starts at rest, fills at the top of the inhale and is empty again before the pause', () => {
    expect(breathCurve(0)).toBeCloseTo(0, 6);
    expect(breathCurve(BREATH.inhale)).toBeCloseTo(1, 6);
    expect(breathCurve(exhaleEnd)).toBeCloseTo(0, 6);
    expect(breathCurve((exhaleEnd + 1) / 2)).toBe(0);
  });

  it('never jumps between frames, including the wrap into the next breath', () => {
    const steps = 2000;
    for (let i = 1; i <= steps; i++) {
      expect(Math.abs(breathCurve(i / steps) - breathCurve((i - 1) / steps))).toBeLessThan(0.01);
    }
  });

  it('rises through the inhale and falls through the exhale', () => {
    for (let p = 0.01; p <= BREATH.inhale; p += 0.01) {
      expect(breathCurve(p)).toBeGreaterThanOrEqual(breathCurve(p - 0.01));
    }
    for (let p = BREATH.inhale + 0.01; p <= exhaleEnd; p += 0.01) {
      expect(breathCurve(p)).toBeLessThanOrEqual(breathCurve(p - 0.01));
    }
  });

  it('lets most of the air out in the first half of the exhale', () => {
    expect(breathCurve(BREATH.inhale + BREATH.exhale / 2)).toBeLessThan(0.35);
  });

  it('treats phases outside 0..1 as the same breath', () => {
    expect(breathCurve(1.2)).toBeCloseTo(breathCurve(0.2), 10);
    expect(breathCurve(-0.8)).toBeCloseTo(breathCurve(0.2), 10);
  });
});

describe('wrap01', () => {
  it('wraps any phase into 0..1', () => {
    expect(wrap01(0.25)).toBeCloseTo(0.25);
    expect(wrap01(1.25)).toBeCloseTo(0.25);
    expect(wrap01(-0.25)).toBeCloseTo(0.75);
    expect(wrap01(1)).toBe(0);
  });
});

describe('dizzyOffset', () => {
  it('starts and ends with the eyes centred', () => {
    for (const t of [0, 1]) {
      expect(dizzyOffset(t).x).toBeCloseTo(0, 6);
      expect(dizzyOffset(t).y).toBeCloseTo(0, 6);
    }
  });

  it('stays inside the gaze range', () => {
    for (let t = 0; t <= 1; t += 0.01) {
      const { x, y } = dizzyOffset(t);
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    }
  });

  it('rolls the eyes all the way around', () => {
    const points = Array.from({ length: 101 }, (_, i) => dizzyOffset(i / 100));
    expect(Math.max(...points.map(p => p.x))).toBeGreaterThan(0.5);
    expect(Math.min(...points.map(p => p.x))).toBeLessThan(-0.5);
    expect(Math.max(...points.map(p => p.y))).toBeGreaterThan(0.3);
    expect(Math.min(...points.map(p => p.y))).toBeLessThan(-0.3);
  });
});

describe('randomBetween', () => {
  it('maps the random source onto the range', () => {
    expect(randomBetween(2, 6, () => 0)).toBe(2);
    expect(randomBetween(2, 6, () => 0.5)).toBe(4);
    expect(randomBetween(-1, 1, () => 0.75)).toBe(0.5);
  });
});

describe('clamp', () => {
  it('limits a value to the range', () => {
    expect(clamp(5, -1, 1)).toBe(1);
    expect(clamp(-5, -1, 1)).toBe(-1);
    expect(clamp(0.3, -1, 1)).toBe(0.3);
  });
});
