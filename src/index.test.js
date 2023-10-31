/**
 * @typedef {import("../index").Chunk} Chunk
 */

import { describe, expect, it } from 'vitest';
import { parse, pare } from './index';

describe('parse', () => {
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

  it('returns "Now this I can understand!" when parsing "1 > 0"', () => {
    const cfg = new Map([['>', (frag1, frag2) => +frag1 > +frag2 ? 'Now this I can understand!' : [frag1, '>', frag2].join('')]]);
    expect(parse(cfg, pare)('1 > 0')).toEqual('Now this I can understand!')
  });

  it('parses "2 > 1 && 1 > 0"', () => {
    const cfg = new Map([
      ['>', (frag1, frag2) => +frag1 > +frag2], 
      ['&&', andOp],
    ]);
    expect(parse(cfg, allTrue)('2 > 1 && 1 > 0')).toEqual(true);
  });

  it('parses "4 + 2 * (1 + 2)"', () => {
    const cfg = new Map([
      [/\(([^(^)])+\)/, processStrInsideParens],
      ['*', multiply],
      ['+', add],
    ]);
    expect(parse(cfg, pare)('4 + 2 * (1 + 2)')).toEqual(10);
  });

  it('parses "(4 + 2) * (1 + 2)"', () => {
    const cfg = new Map([
      [/\(([^(^)])+\)/, processStrInsideParens],
      ['*', multiply],
      ['+', add],
    ]);
    expect(parse(cfg, pare)('(4 + 2) * (1 + 2)')).toEqual(18);
  });

  it('parses "8 * (3 + (1 - 3))', () => {
    const cfg = new Map([
      [/\(([^(^)])+\)/, processStrInsideParens],
      ['*', multiply],
      ['+', add],
      ['-', subtract],
    ]);
    expect(parse(cfg, pare)('8 * (3 + (1 - 3))')).toEqual(8);
  });

  it('parses invalid input', () => {
    const cfg = new Map([['>', (frag1, frag2) => +frag1 > +frag2]]);
    expect(parse(cfg, pare)(null)).toEqual([]);
  });

  it('parses at the boundaries with " + 5 "', () => {
    const cfg = new Map([['', () => {}]]);
    expect(parse(cfg, allUndefined)(' + 5 ')).toEqual(true);
  })
});

/**
 * @param {string} frag1 - First fragment
 * @param {string} frag2 - Second fragment
 * @returns {number}
 */
function add(frag1, frag2) {
  return +frag1 + +frag2;
}

/**
 * @param {string} frag1 - First fragment
 * @param {string} frag2 - Second fragment
 * @returns {number}
 */
function subtract(frag1, frag2) {
  return +frag1 - +frag2;
}

/**
 * @param {string} frag1 - First fragment
 * @param {string} frag2 - Second fragment
 * @returns {number}
 */
function multiply(frag1, frag2) {
  return +frag1 * +frag2;
}

/**
 * @param {string} str - String value inside of parens
 * @param {string} fullStr - Full string value
 * @param {Map<string | RegExp, (...args: unknown[]) => unknown>} cfg - Original config
 * @returns {string}
 */
function processStrInsideParens(str, fullStr, cfg) {
  const result = parse(cfg)(str.slice(1, -1));
  return fullStr.replace(str, pare(result));
}

/**
 * @param {boolean} frag1 - First fragment
 * @param {boolean} frag2 - Second fragment
 * @returns {boolean}
 */
function andOp(frag1, frag2) {
  return frag1 === true && frag2 === true;
}

/**
 * @param {Chunk[]} values - Array of chunks
 * @returns {boolean}
 */
function allTrue(values) {
  return values.every(v => getResult(v) === true);
}

/**
 * @param {Chunk[]} values - Array of chunks
 * @returns {boolean}
 */
function allUndefined(values) {
  return values.every(v => getResult(v) === undefined);
}

/**
 * @param {Chunk} value - Chunk
 * @returns {unknown}
 */
function getResult(value) {
  if (typeof value === 'object' && Object.hasOwn(value, 'result')) {
    return value.result;
  }
  return value;
}
