import { dialsSnapshot, flatten, inferStep, nest, registerDials, resetDials, setDial, snap } from '../dev/dials';

describe('inferStep', () => {
  it('gives about a hundred stops on a power of ten', () => {
    expect(inferStep(0, 1)).toBe(0.01);
    expect(inferStep(0, 0.9)).toBe(0.01);
    expect(inferStep(0, 20)).toBe(0.1);
    expect(inferStep(50, 1000)).toBe(10);
  });
});

describe('snap', () => {
  it('rounds onto the step grid without float noise', () => {
    expect(snap(0.1 + 0.2, 0, 1, 0.01)).toBe(0.3);
    expect(snap(213, 50, 1000, 10)).toBe(210);
  });

  it('clamps to the range', () => {
    expect(snap(-4, 0, 1, 0.01)).toBe(0);
    expect(snap(1.6, 0, 1, 0.25)).toBe(1);
  });
});

describe('flatten and nest', () => {
  const config = {
    spring: { duration: [200, 50, 1000, 10] as const, bounce: [0, 0, 0.9] as const },
    glow: true,
    replay: { type: 'action', label: 'Replay it' } as const,
  };

  it('lists folders, sliders, toggles and actions in order with readable labels', () => {
    const rows = flatten(config);
    expect(rows.map(r => [r.kind, r.path, r.label, r.depth])).toEqual([
      ['folder', 'spring', 'Spring', 0],
      ['slider', 'spring.duration', 'Duration', 1],
      ['slider', 'spring.bounce', 'Bounce', 1],
      ['toggle', 'glow', 'Glow', 0],
      ['action', 'replay', 'Replay it', 0],
    ]);
    expect(rows[2]).toMatchObject({ step: 0.01 });
  });

  it('turns flat values back into the config shape, without actions', () => {
    const rows = flatten(config);
    expect(nest(rows, { 'spring.duration': 300, 'spring.bounce': 0.2, glow: false })).toEqual({
      spring: { duration: 300, bounce: 0.2 },
      glow: false,
    });
  });
});

describe('panel store', () => {
  it('starts at the defaults, takes tweaks and resets', () => {
    registerDials('Test', { size: [10, 0, 20], spring: { bounce: [0, 0, 1] } });
    setDial('Test', 'size', 14);
    setDial('Test', 'spring.bounce', 0.4);
    expect(JSON.parse(dialsSnapshot('Test'))).toEqual({ size: 14, spring: { bounce: 0.4 } });
    resetDials('Test', 'size');
    expect(JSON.parse(dialsSnapshot('Test'))).toEqual({ size: 10, spring: { bounce: 0.4 } });
    resetDials('Test');
    expect(JSON.parse(dialsSnapshot('Test'))).toEqual({ size: 10, spring: { bounce: 0 } });
  });

  it('keeps tweaks across a fast refresh unless that default changed in code', () => {
    registerDials('Refresh', { a: [1, 0, 10], b: [1, 0, 10] });
    setDial('Refresh', 'a', 5);
    setDial('Refresh', 'b', 5);
    registerDials('Refresh', { a: [1, 0, 10], b: [2, 0, 10] });
    expect(JSON.parse(dialsSnapshot('Refresh'))).toEqual({ a: 5, b: 2 });
  });
});
