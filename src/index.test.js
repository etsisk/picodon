import { describe, expect, it } from 'vitest';
import { parse, pare } from './index';

describe('parse', () => {
  it ('parses "> 0"', () => {
    
  });

  it('parses "1 > 0"', () => {
    const cfg = new Map([['>', (frag1, frag2) => +frag1 > +frag2]]);
    expect(parse(cfg, pare)('1 > 0')).toBe(true);
  });

  it('parses "2 > 1 > 0"', () => {
    const cfg = new Map([['>', (frag1, frag2) => +frag1 > +frag2]]);
    expect(parse(cfg, allTrue)('2 > 1 > 0')).toBe(true);
  });

  it('parses "2 > 0 > 1"', () => {
    
    const cfg = new Map([['>', (frag1, frag2) => +frag1 > +frag2]]);
    expect(parse(cfg, allTrue)('2 > 0 > 1')).toBe(false);
  });

  it('returns "Now this I can understand!"', () => {
    const cfg = new Map([['>', (frag1, frag2) => +frag1 > +frag2 ? 'Now this I can understand!' : [frag1, '>', frag2].join('')]]);
    expect(parse(cfg, pare)('1 > 0')).toEqual('Now this I can understand!')
  });

  it('parses "2 > 1 && 1 > 0"', () => {
    const cfg = new Map([
      ['>', (frag1, frag2) => +frag1 > +frag2], 
      ['&&', (frag1, frag2) => frag1 === true && frag2 === true],
    ]);
    expect(parse(cfg, allTrue)('2 > 1 && 1 > 0')).toEqual(true);
  });
});


function andOp(frag1, frag2) {
  return frag1 === true && frag2 === true;
}

function allTrue(values) {
  return values.every(v => getResult(v) === true);
}

function getResult(value) {
  if (typeof value === 'object' && Object.hasOwn(value, 'result')) {
    return value.result;
  }
  return value;
}
