# Pull Everything Together: Integration Plan

> **For agentic workers:** this is a sequential, stateful git integration. Execute it inline
> (superpowers:executing-plans), not with parallel subagents. Steps use checkbox (`- [ ]`) syntax.
> Stop at every gate that fails; never push, delete or force anything that a step does not name.

**Goal:** land the shared folder's uncommitted work and all six worktree branches on `main` as
one tested app, without losing a line of anyone's work.

**Architecture:** back up everything first (refs + bundle). Commit in-flight work where it sits.
Build the result on a new branch `integrate/2026-10-06` in a new worktree outside OneDrive. The
shared folder and `main` stay untouched until a final fast-forward. Branches built on snapshot
commits (`04fcee2`, `c32a6f1`) are replayed with the snapshot as the merge base, so the snapshots
themselves never land.

**Tech stack:** git 2.44 (`merge-tree --write-tree`), Expo SDK 57, jest-expo, ESLint 9
(eslint-config-expo 57), npm.

---

## Where things stand (surveyed 2026-10-06, about 15:30 IST)

| Checkout | Branch @ head | State | What it is | Tests |
|---|---|---|---|---|
| Shared folder (OneDrive) | `main` @ `39079a0` | 23 files uncommitted | Dials panel, nav pill motion, card entrance, cards keyed by tab (list stays mounted), nav shrink, Read-more ease-out, count-up removal, Deposit glass, SF Pro Rounded on iOS, ESLint setup, README/spec | jest 87/87, tsc ok, lint 21 errors (known `.value =` writes) |
| `fix-spring-mass` | `fix/spring-mass` @ `9de0f31` | uncommitted | `mass: 1` on Deposit press/release, nav sink, Read more + `springs.test.ts` | 47/47 |
| `instant-tab-switch` | `fix/instant-tab-switch` @ `c32a6f1` (14:50 snapshot) | uncommitted | deferred list, cards reused, first-load-only entrance, `LABEL_FADE`, memo nav bar | 89/89 |
| `ticking-portfolio` | `feat/ticking-portfolio` @ `5ffc192` | staged, not committed | NumberFlow roll-in and refresh-on-return, patch-package | 80/80 |
| `feed-skeleton` | `feat/feed-skeleton` @ `ce1c998` | 17 commits on the 12:10 snapshot `04fcee2` | loading skeleton, sweep, Skeleton dials | 86/86 |
| `sky-bar-header` | `feat/sky-bar-header` @ `0f4ae8a` | 12 commits on real main `c0053c2` | sky bar overlay, feed dropdown | 76/76 |
| `chore-expo-lint` | `chore/expo-lint` @ `958f806` | 1 commit on `f62c8d4` (15 behind) | ESLint + `.set()` writes | 39/39, lint clean |

Facts that shape the plan:

- **Nothing is pushed.** `origin` (github.com/sachinmotwani02/miracle-rn-test) has no branches
  (`main...origin/main [gone]`). The worktrees live outside OneDrive, so their uncommitted work exists
  in exactly one place.
- **The shared folder's lockfile churn is just ESLint.** Its `package.json`, `package-lock.json` and
  `eslint.config.js` are byte-identical to `chore/expo-lint`'s.
- **Since the 14:50 snapshot (`c32a6f1`), the shared folder only gained nav shrink** (`navShrink.ts`
  and test, `FloatingNavBar`, `DiscoverScreen`) and `SHOW_DIALS = false` in `App.tsx`. So `c32a6f1`
  holds the exact "before nav shrink" versions needed to split the work into clean commits.
- **`fix/spring-mass` is mostly superseded.** Read more now eases open (no spring). The nav sink
  became nav shrink's duration-based spring, which mass does not affect. Only Deposit's
  `PRESS`/`RELEASE` still need `mass: 1`.
- **The skeleton's ghost changes net to zero**, so a squashed replay drops that churn. Replayed onto
  the shared work with base `04fcee2 + 5ffc192` (README as resolved in `3c31c01`), it conflicts in
  exactly one hunk.
- Sessions: 15 idle Claude sessions have this repo as cwd, and none are running. Dev servers are
  running: 8081 (shared folder), 8082 (instant-tab), 8090 (sky-bar), 8095 (skeleton), 8097 (ticking).

### Dry-run conflict forecast (in-object `git merge-tree`, chosen order)

| Step | Conflicted files (hunks) |
|---|---|
| shared work → commits | none (built from file versions) |
| spring-mass | `FloatingNavBar` (1), `NoteBox` (2): take ours, both superseded |
| feed-skeleton (squash replay) | `DiscoverScreen` (1) |
| ticking-portfolio (merge) | `README` (5), spec (2), `package-lock` (8, regenerate), `PortfolioHeader` (2), `DiscoverScreen` (4) |
| sky-bar-header (merge) | `README` (6), `DiscoverScreen` (9) |
| instant-tab-switch (replay) | `README` (2), `FeedTabs` (1), `FloatingNavBar` (1), `DiscoverScreen` (5) |
| expo-lint (merge) | `DepositButton` (1), `FeedTabs` (1), `FloatingNavBar` (2), `Mascot` (3), `DiscoverScreen` (1) |

Hunk counts after the first conflicted step are approximate. The dry run carried "ours" forward
through each conflict.

### Why this order

Big changes land first, nearly verbatim; small ones are re-applied on top. In the reverse order
the total conflict count was the same (about 58 hunks), but the loading skeleton (the most intricate
feature) then conflicted in 6 places instead of 1. The 29-line tab-switch fix is easy to re-apply by
hand, and its whole-screen test then checks the final screen. ESLint goes last, so the `.set()`
conversion runs once, over the final code.

### Shared variables (every bash step)

```bash
REPO="C:/Users/sachi/OneDrive/Desktop/miracle-rn-test"
WT="C:/Users/sachi/.config/superpowers/worktrees/miracle-rn-test"
INT="$WT/integrate"
B=refs/backup/2026-10-06
```

---

## Phase 0: Freeze and back up (changes no files)

### Task 0.1: Quiesce

- [ ] Do not resume any session whose cwd is this repo until Phase 5 is done. A session writing
      into the shared folder or a worktree mid-merge is the main way this plan can go wrong.
- [ ] Optional: pause OneDrive sync for 2 hours (tray icon → Pause syncing). The shared `.git`
      lives in OneDrive, and sync can briefly lock `index.lock` and object files during heavy git work.
- [ ] Leave the dev servers running for now; they only read files. Phase 5 stops the worktree ones.

### Task 0.2: Back up every uncommitted pile and every tip as refs

```bash
cd "$REPO"
snap() {  # snap <name> <checkout>: tracked + untracked files to a backup ref; index and files untouched
  local idx; idx=$(mktemp)
  cp "$(git -C "$2" rev-parse --path-format=absolute --git-path index)" "$idx"
  local tree; tree=$(cd "$2" && GIT_INDEX_FILE="$idx" git add -A && GIT_INDEX_FILE="$idx" git write-tree)
  git update-ref "$B/wip/$1" "$(git commit-tree "$tree" -p "$(git -C "$2" rev-parse HEAD)" -m "backup: $1 uncommitted work")"
  rm -f "$idx"
}
snap shared      "$REPO"
snap spring-mass "$WT/fix-spring-mass"
snap instant-tab "$WT/instant-tab-switch"
snap ticking     "$WT/ticking-portfolio"
for b in main chore/expo-lint feat/feed-skeleton feat/sky-bar-header feat/ticking-portfolio fix/instant-tab-switch fix/spring-mass; do
  git update-ref "$B/tip/$b" "$b"
done
git for-each-ref --format='%(objectname:short) %(refname)' "$B"
```

- [ ] Expected: 4 `wip/*` refs and 7 `tip/*` refs. `git status --short | wc -l` in the shared folder
      shows the same count as before (24 including this plan file).

### Task 0.3: Bundle (a single-file copy of the whole repo, outside OneDrive)

```bash
git -C "$REPO" bundle create "C:/Users/sachi/miracle-rn-test-2026-10-06.bundle" --all
git -C "$REPO" bundle verify "C:/Users/sachi/miracle-rn-test-2026-10-06.bundle"
```

- [ ] Expected: `... is okay`. Restore any piece later with
      `git fetch <bundle> 'refs/backup/*:refs/backup/*'`.

---

## Phase 1: Commit in-flight work where it sits (no content changes)

- [ ] **spring-mass**

```bash
git -C "$WT/fix-spring-mass" add -A
git -C "$WT/fix-spring-mass" commit -m "fix: springs spell out mass 1, since Reanimated 4 defaults to mass 4 (Deposit press and release, nav bar sink, Read more)"
```

- [ ] **instant-tab-switch**

```bash
git -C "$WT/instant-tab-switch" add -A
git -C "$WT/instant-tab-switch" commit -m "fix: feed tab switches are instant: the label commits first, the cards follow in a deferred render and are reused instead of remounted, and the entrance plays on the first load only"
```

- [ ] **ticking-portfolio** (the staged index is the work; nothing may be left unstaged)

```bash
git -C "$WT/ticking-portfolio" diff --quiet && git -C "$WT/ticking-portfolio" commit -m "feat: portfolio figures roll up from the 24h-ago values on open and to a fresh value on return from the background (number-flow-react-native 0.5.1, patched for letter spacing)"
```

- [ ] Gate: each commit's tree equals its backup, for example
      `test "$(git -C "$WT/fix-spring-mass" rev-parse 'HEAD^{tree}')" = "$(git rev-parse "$B/wip/spring-mass^{tree}")" && echo same`
      (same for `instant-tab`, `ticking`). All three worktrees show a clean `git status`.

---

## Phase 2: Build `integrate/2026-10-06` (main and the shared folder untouched)

### Task 2.0: Integration worktree

```bash
git -C "$REPO" worktree add -b integrate/2026-10-06 "$INT" main
cd "$INT"
```

### Task 2.1: The shared folder's work as logical commits

`W=$B/wip/shared` is main plus the shared work. `S14=c32a6f1` is the same work before nav shrink.
Each commit takes whole files, so nothing is hand-edited.

```bash
W=$B/wip/shared; S14=c32a6f1
git checkout $W -- docs/superpowers/plans/2026-10-06-pull-everything-together.md
git commit -m "docs: plan for pulling the parallel branches and the shared folder's work together"

git checkout $W -- eslint.config.js package.json package-lock.json
git commit -m "chore: ESLint 9 through expo lint (eslint-config-expo 57) with its flat config"
npm ci

git checkout $W -- src/theme/typography.ts
git commit -m "feat: SF Pro Rounded on iOS through the system ui-rounded design; Android and web keep Nunito"

git checkout $W -- src/components/DepositButton.tsx src/theme/colors.ts
git commit -m "fix: the Deposit pill's glass comes from the Figma's own shadows (soft white drop shadow, bottom glow, rim catch-lights)"

git rm -q src/components/AnimatedNumber.tsx
git checkout $W -- src/components/PortfolioHeader.tsx
git commit -m "feat: the portfolio value no longer counts up; it is plain text"

git checkout $W -- src/components/NoteBox.tsx
git commit -m "fix: Read more eases open with no bounce and measures the note synchronously, so cards mount at their final height"

git checkout $W -- src/utils/cardEntrance.ts src/__tests__/cardEntrance.test.ts src/components/TradeCard.tsx
git commit -m "fix: the card entrance is a 12 pt rise without the springify bob (cardEntrance)"

git checkout $W -- src/dev src/__tests__/dials.test.ts src/utils/pillMotion.ts src/__tests__/pillMotion.test.ts
git checkout $S14 -- src/components/FloatingNavBar.tsx App.tsx
git commit -m "feat: a Dials panel for live animation tuning in dev builds; the nav pill lands critically damped and stretches along its travel"

git checkout $S14 -- src/screens/DiscoverScreen.tsx
git commit -m "feat: tab switches keep the list mounted and replay the card entrance (cards keyed by tab); FlashList no longer shifts the offset to keep shared cards in place"

git checkout $W -- src/utils/navShrink.ts src/__tests__/navShrink.test.ts src/components/FloatingNavBar.tsx src/screens/DiscoverScreen.tsx
git commit -m "feat: the nav bar shrinks on a scroll down and grows back on a scroll up or at the top (navShrink replaces the scroll-direction sink)"

git checkout $W -- App.tsx
git commit -m "chore: the Dials chip is hidden unless SHOW_DIALS is flipped"

git checkout $W -- README.md docs/superpowers/specs/2026-10-05-discover-feed-design.md
git commit -m "docs: README and spec describe the work above"
```

- [ ] Gate: `git diff --exit-code $W HEAD` prints nothing, so the branch holds the shared work exactly.
- [ ] Gate: `npx jest --ci` gives 10 suites and 87 tests passing; `npx tsc --noEmit` is clean.
- [ ] Gate (each commit builds):

```bash
for c in $(git rev-list --reverse main..HEAD); do
  git checkout -q --detach $c && npx tsc --noEmit >/dev/null 2>&1 && echo "ok   $(git log -1 --format=%s $c | cut -c1-70)" || echo "FAIL $(git log -1 --format=%s $c | cut -c1-70)"
done
git checkout -q integrate/2026-10-06
```

### Task 2.2: spring-mass (only Deposit's springs survive)

```bash
git cherry-pick fix/spring-mass        # conflicts: NoteBox.tsx (2), FloatingNavBar.tsx (1)
git checkout --ours src/components/NoteBox.tsx src/components/FloatingNavBar.tsx
```

- [ ] In `src/__tests__/springs.test.ts`, delete the `SINK` and `REVEAL` imports and their two
      rows. The table becomes:

```ts
import { withSpring, type WithSpringConfig } from 'react-native-reanimated';
import { PRESS, RELEASE } from '../components/DepositButton';
```

```ts
// Tuned with mass 1. Under Reanimated 4's default mass 4 each of these overshot by a third to a half
// of its travel and took 1.5 to 2.6 s to settle.
describe.each([
  { name: 'the Deposit button squeezing on press', config: PRESS, from: 1, to: 0.95, overshootPct: 30 },
  { name: 'the Deposit button springing back on release', config: RELEASE, from: 0.95, to: 1, overshootPct: 30 },
])('$name', ({ config, from, to, overshootPct }) => {
```

```bash
git add -A && GIT_EDITOR=true git cherry-pick --continue
git commit --amend -m "fix: the Deposit press and release springs spell out mass 1, since Reanimated 4 defaults to mass 4" -m "From fix/spring-mass. Its Read more and nav bar sink changes are dropped: Read more now eases open with no spring, and the sink became navShrink's duration-based spring, which mass does not affect."
```

- [ ] Gate: jest gives 11 suites, 91 tests; tsc clean.

### Task 2.3: feed-skeleton as one squashed replay

```bash
T=$(git merge-tree --write-tree 04fcee2 5ffc192 | head -1)   # README conflicts here; use the branch's own resolution from 3c31c01
IDX=$(mktemp); GIT_INDEX_FILE=$IDX git read-tree $T
GIT_INDEX_FILE=$IDX git update-index --cacheinfo 100644,$(git rev-parse 3c31c01:README.md),README.md
BASE=$(git commit-tree $(GIT_INDEX_FILE=$IDX git write-tree) -p 04fcee2 -p 5ffc192 -m "replay base for feat/feed-skeleton: snapshot 04fcee2 + main 5ffc192")
rm -f $IDX
test -z "$(git grep -l '^<<<<<<< ' $BASE)" && echo "base clean"
SQUASH=$(git commit-tree "feat/feed-skeleton^{tree}" -p $BASE -F - <<'MSG'
feat: loading skeleton for the Discover screen

Squashed from feat/feed-skeleton (17 commits, ce1c998) and replayed onto main
without the snapshot commit it was built on (04fcee2).

- A mock API with per-call latency and a hold switch (src/data/api.ts) and a
  resource store that caches loads and owns the skeleton timing
  (src/data/resources.ts): bones from the first frame on a cold start, a
  150 ms show delay on a tab's first visit, no bones on a cache hit.
- Bones for the portfolio, carousel cards and feed cards, announced as busy,
  handed over in place by Reveal (only the bones fade; shells and chrome stay
  solid).
- One very subtle light sweep crosses every bone while anything loads: a
  100 pt, 35% band in 650 ms on an ease-in-out cubic, then a 1.1 s rest.
- Dials > Skeleton: per-call latency, Hold loading, Replay cold start.
- Spec and plan: docs/superpowers/{specs,plans}/2026-10-06-feed-skeleton*.
MSG
)
git cherry-pick $SQUASH                # conflicts: DiscoverScreen.tsx (1 hunk, the end of the JSX)
```

- [ ] Resolve the hunk to the skeleton's wrapper, with nav shrink's nav bar (no `scrollDirection` prop):

```tsx
        <BottomFade height={navClearance + 20} />
        <FloatingNavBar active={nav} onChange={setNav} scrollY={scrollY} />
      </View>
    </SkeletonSweep>
  );
}
```

- [ ] Check that the whole `return (...)` nests `<View style={styles.root}>` inside
      `<SkeletonSweep active={loading}>`. The skeleton re-indented it, and the merged lines outside
      the hunk should already carry that indent. Then
      `grep -nE 'scrollDirection|lastY|withDelay' src/screens/DiscoverScreen.tsx` must print nothing.
- [ ] `git add -A && GIT_EDITOR=true git cherry-pick --continue`
- [ ] Gate: jest gives 15 suites, adding `api`, `resources`, `skeleton` and `skeletonViews`; tsc clean.

### Task 2.4: ticking-portfolio: hooks first (in its own worktree, TDD), then merge

The skeleton loads the portfolio, so it starts out `undefined`. The roll-in must start when the
portfolio arrives, not at mount. Make the two hooks accept that on the ticking branch, where they
can be tested alone.

- [ ] **Step 1: failing tests.** In `$WT/ticking-portfolio`, add this to the `useRollIn`
      describe in `src/__tests__/PortfolioTicker.test.tsx`:

```ts
  it('waits for a portfolio that is still loading, then rolls a beat after it arrives', async () => {
    const { result, rerender } = await renderHook((live: typeof start | undefined) => useRollIn(live), {
      initialProps: undefined as typeof start | undefined,
    });
    expect(result.current).toBeUndefined();
    await act(async () => {
      jest.advanceTimersByTime(5000); // loading takes longer than the beat
    });
    expect(result.current).toBeUndefined();
    await rerender(start);
    expect(result.current).toEqual(dayAgo);
    await act(async () => {
      jest.advanceTimersByTime(ROLL_IN_DELAY - 1);
    });
    expect(result.current).toEqual(dayAgo);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(start);
  });
```

  And this to the `useLivePortfolio` describe in `src/__tests__/live.test.ts`:

```ts
  it('is empty while the portfolio loads, then shows it and starts listening once it arrives', async () => {
    const rand = mulberry32(1);
    const { result, rerender } = await renderHook(
      (s: typeof start | undefined) => useLivePortfolio(s, rand),
      { initialProps: undefined as typeof start | undefined },
    );
    expect(result.current).toBeUndefined();
    // Nothing to refresh yet, so nothing listens for returns from the background.
    expect(addListener).not.toHaveBeenCalled();
    await rerender(start);
    expect(result.current).toBe(start);
    expect(addListener).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2:** `npx jest PortfolioTicker live` should fail: the roll-in fires 400 ms after
      mount, and `useLivePortfolio` dereferences `undefined`.
- [ ] **Step 3: implement.** `src/components/PortfolioTicker.tsx`:

```ts
export function useRollIn(live: Portfolio | undefined): Portfolio | undefined {
  const reduceMotion = useReducedMotion();
  const [rolled, setRolled] = useState(reduceMotion);
  const arrived = live !== undefined;

  useEffect(() => {
    // The beat starts when the portfolio arrives (after its bones), not when the screen mounts.
    if (rolled || !arrived) return;
    const timer = setTimeout(() => setRolled(true), ROLL_IN_DELAY);
    return () => clearTimeout(timer);
  }, [rolled, arrived]);

  const dayAgo = useMemo(() => {
    if (!live) return undefined;
    const opening = openingValue(live);
    return portfolioAt(opening, opening);
  }, [live]);
  return rolled ? live : dayAgo;
}
```

  `src/data/live.ts`: the signature becomes
  `useLivePortfolio(start: Portfolio | undefined, rand: () => number = Math.random): Portfolio | undefined`,
  and the effect opens with `if (!start) return;`. The `latest` state and the
  `latest.from === start ? latest.live : start` return need no change.
- [ ] **Step 4:** `npx jest` (all pass) and `npx tsc --noEmit`.
- [ ] **Step 5:** commit on `feat/ticking-portfolio`:
      `fix: the roll-in and live value wait for a portfolio that is still loading; the beat starts when it arrives`
- [ ] **Merge** (back in `$INT`):

```bash
cd "$INT"
git merge --no-ff feat/ticking-portfolio -m "Merge feat/ticking-portfolio: portfolio figures roll in once loaded and refresh on return"
git checkout --ours package-lock.json && npm install   # package.json merges cleanly; postinstall applies patches/
npm ls number-flow-react-native patch-package           # 0.5.1 exactly, ^8.0.1
npx expo install --check
```

- [ ] `src/components/PortfolioHeader.tsx` resolves to the skeleton's bones and Reveal around the ticker:

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portfolio } from '../data/types';
import { colors, layout, text } from '../theme';
import { DepositButton } from './DepositButton';
import { PortfolioTicker } from './PortfolioTicker';
import { PortfolioBones } from './skeleton/PortfolioBones';
import { Reveal } from './skeleton/Reveal';

/**
 * Until the portfolio arrives the value and delta are bones; the label and Deposit stay real.
 * `shown` is what the numbers draw while they roll in (see useRollIn); screen readers hear `portfolio`.
 */
export function PortfolioHeader({
  portfolio,
  shown,
  reveal = false,
}: {
  portfolio?: Portfolio;
  shown?: Portfolio;
  reveal?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[text.portfolioLabel, styles.label]} maxFontSizeMultiplier={1.3}>
          Your portfolio
        </Text>
        {portfolio ? (
          <Reveal active={reveal} bones={<PortfolioBones />}>
            <PortfolioTicker portfolio={portfolio} shown={shown} />
          </Reveal>
        ) : (
          <PortfolioBones />
        )}
      </View>
      <DepositButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: layout.headerPadding,
    paddingRight: layout.screenPadding,
  },
  left: { flex: 1, paddingRight: 12 },
  label: { color: colors.white, marginBottom: 4 },
});
```

- [ ] `src/screens/DiscoverScreen.tsx`:
  - Imports: add `useLivePortfolio` (`../data/live`) and `useRollIn` (`../components/PortfolioTicker`).
    Drop the ticking side's `../data/mock` import (the skeleton fetches through `../data/api`).
  - In `Discover`, right after `const portfolio = useResource('portfolio', ...)`:

```tsx
  // Held here, above the cards, so a tab switch restarts neither; Replay remounts Discover and rolls again.
  const livePortfolio = useLivePortfolio(portfolio.data);
  const shownPortfolio = useRollIn(livePortfolio);
```

  - Header: `<PortfolioHeader portfolio={livePortfolio} shown={shownPortfolio} reveal={portfolio.revealing} />`.
    Its `useMemo` deps: `[insets.top, tab, livePortfolio, shownPortfolio, portfolio.revealing, topTrades.data, topTrades.revealing]`.
  - Drop the ticking side's `scrollDirection`, `lastY` and `firstMount` lines; nav shrink replaced them.
- [ ] README and spec: keep both sides. The spec's value line becomes
      `- "$12,057.70" 22 pt bold, white; cap top 97 (rolls up to it from the 24h-ago value once the portfolio loads, see below).`
- [ ] `git add -A && git commit --no-edit`
- [ ] Gate: jest gives 20 suites; tsc clean. On web: bones, then a 240 ms reveal, then the roll
      400 ms after the data arrives (the reveal is done first). With Reduce Motion: no roll.

### Task 2.5: sky-bar-header (merge)

```bash
git merge --no-ff feat/sky-bar-header -m "Merge feat/sky-bar-header: the sky bar (status bar and header on scroll) with a feed dropdown"
```

`DiscoverScreen.tsx` (about 9 hunks) resolves by these rules:

- [ ] Imports: union. Keep `useEffect`, `useRef`, `FlashListRef`, `useComposedEventHandler` and the
      sky bar's `SkyBar`, `FeedMenu`, `useSkyBar` and `SKY_BAR`, plus its local `a11yHidden` helper
      above the component. Keep the skeleton's api/resources/dials/skeleton imports and the ticking
      hooks. Drop `withDelay`/`withTiming` unless something still uses them.
- [ ] State in `Discover`: keep `bar = useSkyBar(scrollY, insets.top)`, `listRef`, `landOnFeed`,
      `menuOpen`. No `scrollDirection` or `lastY`.
- [ ] Scroll: the screen's handler is just `onScroll: e => { scrollY.set(e.contentOffset.y); }`,
      then `const onScroll = useComposedEventHandler([scrollHandler, bar.scrollHandler]);`, and
      the list takes `onScroll={onScroll}`.
- [ ] `renderItem`: the skeleton's `Reveal` version, unchanged (Task 2.6 removes its key).
- [ ] Header: the skeleton and ticking header content, inside the sky bar's wrappers.
      `bar.onHeaderLayout` goes on the outer view. The portfolio wrapper is
      `<View onLayout={bar.onPortfolioLayout} {...a11yHidden(bar.pinned)}>` around `PortfolioHeader`.
      The tabs wrapper is `<View onLayout={bar.onTabsLayout} {...a11yHidden(bar.docked)}>`, and
      `FeedTabs` gets `fold`, `folded` and `onOpenMenu`. Deps: the union of both lists.
- [ ] JSX: everything inside `<SkeletonSweep active={loading}><View style={styles.root}>`, in the
      sky bar's order: sky background, list (with `ref={listRef}`), `<SkyBar .../>`, `BottomFade`,
      `FloatingNavBar` (no `scrollDirection`), `<FeedMenu .../>`.
- [ ] README: keep both sides.
- [ ] `git add -A && git commit --no-edit`
- [ ] Gate: jest gives 21 suites (adds `skyBar`); tsc clean. On web, measure the header's `y`
      positions before and after the portfolio loads: they must match. The sky bar reads those
      measurements, and the bones and the ticker must keep the same line boxes. Check the sky bar
      appears on scroll and the dropdown picks a feed.

### Task 2.6: instant-tab-switch, re-applied on the final screen

```bash
git cherry-pick fix/instant-tab-switch   # conflicts: README (2), FeedTabs (1), FloatingNavBar (1), DiscoverScreen (5)
```

- [ ] `FloatingNavBar.tsx`: nav shrink's doc comment, memoised:

```tsx
 * tab. The bar sinks and shrinks out of the way on a scroll down and rises back on a scroll up
 * (see navShrink).
 * Memoised: a feed tab switch re-renders the screen, and the bar and its ghost have nothing to redo.
 */
export const FloatingNavBar = React.memo(function FloatingNavBar({ active, onChange, scrollY }: Props) {
```

  The function's closing brace becomes `});`.
- [ ] `FeedTabs.tsx`: keep the sky bar's `Tab` (fold, `x`, folded, `onLayout`), export `LABEL_FADE`
      (add `Easing` to the import), and use it for the label opacity:
      `opacity: withTiming(selected ? 1 : 0.72, LABEL_FADE)`.
- [ ] `DiscoverScreen.tsx`, in `Discover`:
  - State: `const [selection, setSelection] = useState<{ tab: TabKey; switched: boolean }>({ tab: 'discover', switched: false });`
    and `const shown = useDeferredValue(selection);` replace `tab`. Keep
    `const [firstTab] = useState(selection.tab);` and `const cold = shown.tab === firstTab;`.
  - The feed resource follows the deferred tab: `useResource(\`feed:${shown.tab}\`, () => fetchFeed(shown.tab, cold ? latency.feed : latency.tabFeed), { showDelay: cold ? 0 : SKELETON.gate.showDelay })`.
  - `const onTab = useCallback((tab: TabKey) => setSelection(prev => (prev.tab === tab ? prev : { tab, switched: true })), []);`
  - `FeedTabs active={selection.tab} onChange={onTab}`. The sky bar's `feedLabel`
    (`TABS.find(t => t.key === selection.tab)`) and `FeedMenu active` read `selection.tab`.
    `onPickFeed` becomes
    `(next) => { setMenuOpen(false); if (next === selection.tab) return; landOnFeed.current = true; onTab(next); }`
    with deps `[selection.tab, onTab]`. The effect that lands the list on the feed depends on
    `[shown.tab, bar.feedTop]`, so it scrolls after the new cards render.
  - `renderItem`: no `key={tab}` on `Reveal`; `animateIn={!revealing && !shown.switched && index < ENTRANCE_COUNT}`;
    deps `[shown.switched, expanded, onToggleNote, revealing]`. Without the key, a card that mounts
    when a feed arrives (the list is empty while a tab first loads) still reveals, because `Reveal`
    reads `active` on mount. Cards for a cached feed are reused.
  - Header deps: `selection.tab` replaces `tab`.
- [ ] `src/__tests__/tabSwitch.test.tsx`: loads now go through the resource store, so drive time.
      Keep the five behaviours; two of them change meaning:

```ts
import { act } from '@testing-library/react-native';
import { clearResources } from '../data/resources';

const settle = () => act(() => jest.advanceTimersByTimeAsync(5000)); // every load and reveal window
const press = async (label: string) =>
  userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(screen.getByRole('tab', { name: label }));

beforeEach(() => {
  jest.useFakeTimers();
  clearResources();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
```

  - Each `render(<DiscoverScreen />)` is followed by `await settle()`, and so is each `press(...)`
    whose assertions need the new feed.
  - "keeps a card that is in both feeds mounted": a tab's first visit loads (the list empties, then
    reveals), so assert the reuse on a cached visit: Following, settle, Discover, settle, grab
    `$18.4K`, Following, then the same-view check.
  - "plays the staggered entrance ... when the feed first loads" becomes "a cold start reveals the
    first cards from their bones instead of playing the entrance": `entering()` has length 0 after
    the load. The skeleton's tests own the reveal itself.
  - "lights up the tapped tab before the cards change", "does not replay the entrance" and "leaves
    the nav bar and its ghost alone" keep their assertions.
- [ ] README: keep both sides.
- [ ] `git add -A && GIT_EDITOR=true git cherry-pick --continue`
- [ ] Gate: jest gives 23 suites (adds `feedTabs`, `tabSwitch`); tsc clean. On web, repeat the
      memory's measurement for a cached tab: the label paints in about 16 ms or less, and the cards
      are reused.
- [ ] Check the dropdown to a feed not yet visited. That feed is empty while it loads, so the
      landing scroll can clamp short of `bar.feedTop`. If it does, land when the feed's phase
      becomes `content` instead of when `shown.tab` changes, and add that case to `tabSwitch.test.tsx`.

### Task 2.7: chore/expo-lint (merge, then finish the `.set()` conversion)

```bash
git merge --no-ff chore/expo-lint -m "Merge chore/expo-lint: ESLint and compiler-safe shared value writes"
# conflicts: DepositButton (1), FeedTabs (1), FloatingNavBar (2), Mascot (3), DiscoverScreen (1)
git checkout --ours src/components/DepositButton.tsx src/components/FeedTabs.tsx src/components/FloatingNavBar.tsx src/components/Mascot.tsx src/screens/DiscoverScreen.tsx
git grep -nE '\.value\s*=[^=]' -- src     # every remaining shared value write
```

- [ ] Convert each write to `.set()`, on the JS thread and in worklets alike; reads keep `.value`.
      `x.value = expr;` becomes `x.set(expr);`. A compound write like `x.value += d` becomes
      `x.set(x.value + d)`. Deposit's become `scale.set(withSpring(0.95, PRESS))` and
      `scale.set(withSpring(1, RELEASE))`. `git grep -nE '\.value\s*=[^=]' -- src` must end empty.
- [ ] `npx expo lint`: 0 errors. Review the warnings and fix or justify each.
- [ ] `git add -A && git commit --no-edit`
- [ ] Gate: lint clean, jest 23 suites, tsc clean.

### Task 2.8: Docs pass

- [ ] Read `README.md` top to bottom and make it one document: one section per feature, no
      duplicated paragraphs from the merges, and an updated "What I would do next" (drop what is now
      done). Note that the Dials chip (skeleton replay, pill tuning) needs `SHOW_DIALS = true` in
      `App.tsx`.
- [ ] Same pass over `docs/superpowers/specs/2026-10-05-discover-feed-design.md`.
- [ ] `git commit -am "docs: README and spec describe the integrated app"`

---

## Phase 3: Verify the whole branch

- [ ] `npx jest --ci` (23 suites), `npx tsc --noEmit`, `npx expo lint` (0 errors), `npx expo-doctor`,
      `npx expo install --check`.
- [ ] Web smoke test from `$INT` on a free port (8098). Use the memory's `.claude/launch.json` trick:
      back the file up, add the config, `preview_start`, restore at once. Run the pane visible, or
      drive rAF per the memory.
      Check each of these:
      - Cold start: bones, then the sweep, then the reveal, then the portfolio roll.
      - Tab switch: the label is instant; a first visit shows blank, then bones, then content; a
        cached visit is instant.
      - The sky bar appears on scroll, the dropdown picks a feed and lands on its first card.
      - Nav shrink on scroll down and up.
      - Nav pill travel.
      - Ghost: tap, and the rare spin on every fourth tap.
      - Read more.
      - Deposit press.
- [ ] Your device pass in Expo Go (iPhone). Web cannot show native spring bugs, NumberFlow
      tracking, or SF Pro Rounded.

## Phase 4: Land on main

```bash
cd "$REPO"
# 1. The shared folder must not have changed since the backup (ticks in this plan file aside):
IDX=$(mktemp); cp .git/index "$IDX"; GIT_INDEX_FILE="$IDX" git add -A
NOW=$(GIT_INDEX_FILE="$IDX" git write-tree); rm -f "$IDX"
git diff --quiet "$B/wip/shared" $NOW -- . ':!docs/superpowers/plans/2026-10-06-pull-everything-together.md' && echo unchanged
# 2. Park the work (all of it is in the integration branch) and fast-forward:
git stash push -u -m "shared folder work before landing integrate/2026-10-06 (all of it is in that branch)"
git merge --ff-only integrate/2026-10-06
npm install                      # number-flow-react-native, patch-package; postinstall applies patches/
npx jest --ci && npx tsc --noEmit && npx expo lint
```

- [ ] If step 1 does not print `unchanged`, stop. Someone edited the shared folder after the backup;
      fold that edit in on the integration branch first.
- [ ] Restart the 8081 server with a clean cache: `npx expo start -c`.

## Phase 5: Clean up (each item confirmed first)

- [ ] Stop the worktree dev servers: 8082, 8090, 8095, 8097. Re-check their PIDs with
      `Get-NetTCPConnection -State Listen` first.
- [ ] Remove the 7 worktrees: `git worktree remove "$WT/<name>"`. On "Filename too long", run
      `cmd /c 'rmdir /s /q "\\?\C:\Users\sachi\.config\superpowers\worktrees\miracle-rn-test\<name>"'`
      and then `git worktree prune`.
- [ ] Delete branches. Merged ones:
      `git branch -d integrate/2026-10-06 feat/ticking-portfolio feat/sky-bar-header chore/expo-lint`.
      Landed by replay (their originals stay reachable under `$B/tip/*` and in the bundle):
      `git branch -D fix/spring-mass fix/instant-tab-switch feat/feed-skeleton`.
- [ ] After a few days of using main: `git stash drop`, and delete `$B/*` with
      `git for-each-ref --format='%(refname)' "$B" | xargs -n1 git update-ref -d`. The bundle is the
      long-term copy.
- [ ] Archive the 15 idle sessions; their worktrees are gone.
- [ ] Update memory: the feed-skeleton and instant-tab-switch notes are now history, and the
      practical's status changes.

## Phase 6 (only with an explicit yes): publish

- [ ] `git push -u origin main`. This is the first push: it publishes the whole history to GitHub.
      Backup refs and tags stay local.

## Rollback

- Before Phase 4, `main` and the shared folder are untouched. Abandon with
  `git worktree remove "$INT" && git branch -D integrate/2026-10-06`.
- After Phase 4, `git reset --hard 39079a0 && git stash pop` in the shared folder restores the exact
  starting state.
- Every original piece is kept under `refs/backup/2026-10-06/*` and in the bundle.
