import { BREATH, TURN, breathCurve, clamp, dizzyOffset, randomBetween, turnPose, wrap01 } from '../utils/mascotMotion';

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
