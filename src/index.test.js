/**
 * @typedef {import("../index").Cfg} Cfg
 * @typedef {import("../index").Chunk} Chunk
 * @typedef {import("../index").Lexer} Lexer
 * @typedef {import("../index").Parser} Parser
 */

import { describe, expect, it } from "vitest";
import { parse, resolver } from "./index";

describe("parse", () => {
  it('parses "1 > 0"', () => {
    const cfg = { rules: new Map([[">", gt]]) };
    expect(parse(cfg, resolver)("1 > 0")).toBe(true);
  });

  it('parses "(2 > 1) > 0"', () => {
    const cfg = { rules: new Map([[">", gt]]) };
    expect(parse(cfg, allTrue)("2 > 1 > 0")).toBe(true);
  });

  it('parses "2 > 0 > 1"', () => {
    const cfg = { rules: new Map([[">", gt]]) };
    expect(parse(cfg, allTrue)("2 > 0 > 1")).toBe(false);
  });

  it('returns "Now this I can understand!" when parsing "1 > 0"', () => {
    const cfg = {
      rules: new Map([[
        ">",
        /** @param {string} frag1 @param {string} frag2 */
        (frag1, frag2) =>
          +frag1 > +frag2
            ? "Now this I can understand!"
            : [frag1, ">", frag2].join(""),
      ]]),
    };
    expect(parse(cfg, resolver)("1 > 0")).toEqual("Now this I can understand!");
  });

  it('parses "2 > 1 && 1 > 0"', () => {
    const cfg = {
      rules: new Map([
        [">", gt],
        ["&&", andOp],
      ]),
    };
    expect(parse(cfg, allTrue)("2 > 1 && 1 > 0")).toEqual(true);
  });

  it('parses "3 0 |0 1"', () => {
    const cfg = {
      modifiers: new Map([
        [/\d+\s?\|\s?\d+/, /** @param {string} str @param {string} fullStr @param {Cfg} cfg */(str, fullStr, cfg) => {
          const result = parse({ rules: cfg.rules }, resolver)(str);
          return fullStr.replace(str, result);
        }],
      ]),
      rules: new Map([
        ["|", /** @param {string} frag1 @param {string} frag2 */(frag1, frag2) => +frag1 ^ +frag2 ? ">" : "<"],
        ["<", lt],
      ]),
    };
    expect(parse(cfg, resolver)("3 0 |0 1")).toEqual(false);
  });

  it('parses "4 + 2 * (1 + 2)"', () => {
    const cfg = {
      modifiers: new Map([[/\(([^(^)])+\)/, processStrInsideParens]]),
      rules: new Map([
        ["*", multiply],
        ["+", add],
      ]),
    };
    expect(parse(cfg, resolver)("4 + 2 * (1 + 2)")).toEqual(10);
  });

  it('parses "(4 + 2) * (1 + 2)"', () => {
    const cfg = {
      modifiers: new Map([
        [/\(([^(^)])+\)/, processStrInsideParens],
      ]),
      rules: new Map([
        ["*", multiply],
        ["+", add],
      ]),
    };
    expect(parse(cfg, resolver)("(4 + 2) * (1 + 2)")).toEqual(18);
  });

  it('parses "8 * (3 + (1 - 3))', () => {
    const cfg = {
      modifiers: new Map([
        [/\(([^(^)])+\)/, processStrInsideParens],
      ]),
      rules: new Map([
        ["*", multiply],
        ["+", add],
        ["-", subtract],
      ]),
    };
    expect(parse(cfg, resolver)("8 * (3 + (1 - 3))")).toEqual(8);
  });

  it('parses "-1 - -1"', () => {
    const cfg = {
      rules: new Map([[/-(?!(\.|[0-9]))/, subtract]]),
    };
    expect(parse(cfg, resolver)("-1 - -1")).toEqual(0);
  });

  it('parses "3 + 1 = (7 - 11) * -1"', () => {
    const cfg = {
      modifiers: new Map([
        [/\(([^(^)])+\)/, processStrInsideParens],
      ]),
      rules: new Map([
        ["*", multiply],
        ["+", add],
        [/-(?!(\.|[0-9]))/, subtract],
        ["=", equal],
      ]),
    };
    expect(parse(cfg, resolver)("3 + 1 = (7 - 11) * -1")).toEqual(true);
  });

  it('parses "1 > 0 plus all of this text too"', () => {
    const cfg = {
      rules: new Map([[">", /** @param {string} frag1 @param {string} frag2 */(frag1, frag2) => +frag1 > parseInt(frag2)]]),
    };
    expect(parse(cfg, resolver)("1 > 0 plus all of this text too")).toEqual(true);
  });

  it("parses invalid input", () => {
    const cfg = { rules: new Map([[">", gt]]) };
    expect(parse(cfg, resolver)(null)).toEqual([]);
  });

  it('returns the original string when no matches are found', () => {
    const cfg = { rules: new Map([['>', gt]]) };
    expect(parse(cfg, resolver)('no matches found')).toEqual('no matches found');
  });

  it('parses at the boundaries with " + 5 "', () => {
    const cfg = { rules: new Map([["", () => {}]]) };
    expect(parse(cfg, allUndefined)(" + 5 ")).toEqual(true);
  });

  it.skip(
    "throws an error when the string contains something that's not permitted",
  );
});

/**
 * @param {string} frag1 - First fragment
 * @param {string} frag2 - Second fragment
 * @returns {boolean}
 */
function gt(frag1, frag2) {
  return +frag1 > +frag2;
}

/**
 * @param {string} frag1 - First fragment
 * @param {string} frag2 - Second fragment
 * @returns {boolean}
 */
function lt(frag1, frag2) {
  return +frag1 < +frag2;
}

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
 * @param {string} frag1 - First fragment
 * @param {string} frag2 - Second fragment
 * @returns {boolean}
 */
function equal(frag1, frag2) {
  return +frag1 === +frag2;
}
/**
 * @param {string} str - String value inside of parens
 * @param {string} fullStr - Full string value
 * @param {Cfg} cfg - Original config
 * @returns {string}
 */
function processStrInsideParens(str, fullStr, cfg) {
  const result = parse(cfg)(str.slice(1, -1));
  return fullStr.replace(str, resolver(result));
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
  return values.every((v) => getResult(v) === true);
}

/**
 * @param {Chunk[]} values - Array of chunks
 * @returns {boolean}
 */
function allUndefined(values) {
  return values.every((v) => getResult(v) === undefined);
}

/**
 * @param {Chunk} value - Chunk
 * @returns {unknown}
 */
function getResult(value) {
  if (typeof value === "object" && Object.hasOwn(value, "result")) {
    return value.result;
  }
  return value;
}
