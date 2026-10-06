import {
  BREATH,
  RIBBON,
  TRAIL,
  TURN,
  breathCurve,
  clamp,
  dizzyOffset,
  randomBetween,
  ribbonArc,
  ribbonPaths,
  trailPath,
  turnPose,
  wrap01,
} from '../utils/mascotMotion';

describe('ribbonPaths', () => {
  const orbit = { rx: 20, ry: 5, tilt: 0 };
  const cx = 38;
  const cy = 28;
  const coords = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = (d: string) => coords(d).filter((_, i) => i % 2 === 0);
  const ys = (d: string) => coords(d).filter((_, i) => i % 2 === 1);
  const pad = RIBBON.width;

  it('draws nothing for a ribbon with no length', () => {
    expect(ribbonPaths(90, 0, orbit, 1, cx, cy)).toEqual({ front: 'M0 0', back: 'M0 0' });
  });

  it('puts the near half of the orbit in front of the ghost and the far half behind it', () => {
    // Seen from slightly above, the near side of a flat orbit is its lower half.
    const nearOnly = ribbonPaths(40, 70, orbit, 1, cx, cy); // -30..40 deg: all on the near side
    expect(nearOnly.back).toBe('M0 0');
    for (const y of ys(nearOnly.front)) expect(y).toBeGreaterThanOrEqual(cy - pad);
    const farOnly = ribbonPaths(220, 70, orbit, 1, cx, cy); // 150..220 deg: all on the far side
    expect(farOnly.front).toBe('M0 0');
    for (const y of ys(farOnly.back)) expect(y).toBeLessThanOrEqual(cy + pad);
  });

  it('splits a ribbon that wraps round the side into a front piece and a back piece', () => {
    const p = ribbonPaths(130, 100, orbit, 1, cx, cy); // 30..130 deg crosses 90
    expect(p.front).not.toBe('M0 0');
    expect(p.back).not.toBe('M0 0');
  });

  it('tilts the orbit and grows it with the spread', () => {
    const flat = ribbonPaths(200, 200, orbit, 1, cx, cy);
    const tilted = ribbonPaths(200, 200, { ...orbit, tilt: 45 }, 1, cx, cy);
    const span = (d: string) => Math.max(...ys(d)) - Math.min(...ys(d));
    expect(span(tilted.front + tilted.back)).toBeGreaterThan(span(flat.front + flat.back) + 5);
    const wide = ribbonPaths(200, 200, orbit, 1.5, cx, cy);
    for (const x of xs(wide.front + wide.back)) expect(Math.abs(x - cx)).toBeLessThanOrEqual(orbit.rx * 1.5 + pad);
    expect(Math.max(...xs(wide.front + wide.back))).toBeGreaterThan(cx + orbit.rx * 1.2);
  });

  it('never draws more than the longest ribbon', () => {
    expect(ribbonPaths(300, 999, orbit, 1, cx, cy)).toEqual(ribbonPaths(300, RIBBON.maxArc, orbit, 1, cx, cy));
  });
});

describe('ribbonArc', () => {
  it('gets longer the faster the swirl runs, within limits', () => {
    expect(ribbonArc(0)).toBe(RIBBON.minArc);
    expect(ribbonArc(600)).toBeGreaterThan(ribbonArc(200));
    expect(ribbonArc(100000)).toBe(RIBBON.maxArc);
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
