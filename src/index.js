/**
 * @typedef {import("../index").Cfg} Cfg
 * @typedef {import("../index").ProcessedChunk} ProcessedChunk
 * @typedef {import("../index").Chunk} Chunk
 */

/**
 * @param {Cfg} cfg - Map of config for parsing
 * @param {(chunks: ProcessedChunk[]) => unknown} [sum=(n) => n] - Summarizing function
 * @returns {(str: string) => ProcessedChunk[] | unknown}
 */
function parse(cfg, sum = (n) => n) {
  const modifiers = [...cfg.modifiers?.keys()];
  const tokens = [...cfg.tokens.keys()];

  return function process(str) {
    // QUESTION: Do we want to restrict modifiers to be RegExp[] ?
    const regexs = modifiers.filter((key) => key.test !== undefined);

    for (let regex of regexs) {
      const match = str.match(regex);
      if (match) {
        const regexFn = cfg.modifiers.get(regex);
        if (regexFn) {
          return process(regexFn(match[0], str, cfg));
        }
      }
    }

    const chunked = chunkStr(tokens, str);
    const chunks = processChunked(chunked, tokens[0], tokens, cfg.tokens);
    return sum(chunks);
  }
}

/**
 * @param {(string|RegExp)[]} tokens - Array of matchers
 * @param {string} str - String to parse
 * @returns {string[]}
 */
function chunkStr(tokens, str) {
  const keys = tokens.map((k) => {
    if (typeof k === 'string') {
      return escapeRegExp(k);
    }
    return k.source;
  }).join('|');
  const regex = new RegExp(`(${keys})`, 'g');
  return str?.split(regex)?.flatMap((chunk) => {
    if (chunk === undefined) {
      return [];
    }
    return chunk.trim();
  }) ?? [];
}

/**
 * @param {string} str - Unescaped string
 * @returns {string}
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {Chunk[]} chunked - An array of processed and unprocessed chunks
 * @param {string | RegExp} matcher - The matcher to test against
 * @param {(string | RegExp)[]} matchers - The full list of matchers
 * @param {Cfg["tokens"]} map - The full list of matchers with their values
 * @returns {ProcessedChunk[]}
 */
function processChunked(chunked, matcher, matchers, map) {
  const { indicesToPrune, unPrunedChunks } = chunked.reduce((result, chunk, i) => {
    // TODO: Check if type of chunk is ProcessedChunk
    if ((typeof matcher === 'string' && chunk === matcher) || (typeof matcher !== 'string' && typeof chunk === 'string' && chunk.match(matcher))) {
      const fn = map.get(matcher);
      const siblingChunks = getSiblingChunks(chunked, i);
      return {
        indicesToPrune: { ...result.indicesToPrune, [i - 1]: true, [i + 1]: true },
        // NOTE: https://github.com/microsoft/TypeScript/issues/10479
        unPrunedChunks: result.unPrunedChunks.concat([{
          chunks: {
            ...Object.fromEntries(siblingChunks),
            [i]: matcher,
          },
          func: fn,
          result: fn?.apply(
            null,
            Array.from(siblingChunks.values()).map((chunk) => getParam(chunk)),
          ),
          symbol: matcher,
        }]),
      }
    }
    return {
      indicesToPrune: result.indicesToPrune,
      // NOTE: https://github.com/microsoft/TypeScript/issues/10479
      unPrunedChunks: result.unPrunedChunks.concat([chunk]),
    };
  }, { unPrunedChunks: [], indicesToPrune: {} });

  const prunedChunks = pruneChunks(unPrunedChunks, indicesToPrune);
  const nextMatcher = getNextMatcher(matcher, matchers);

  if (nextMatcher) {
    return processChunked(prunedChunks, nextMatcher, matchers, map);
  }
  return prunedChunks;
}

/**
 * @param {string | RegExp} currentMatcher - The current matcher
 * @param {(string | RegExp)[]} allMatchers - The full list of matchers
 * @returns {string | RegExp | undefined}
 */
function getNextMatcher(currentMatcher, allMatchers) {
  const currentIndex = allMatchers.findIndex(m => m === currentMatcher);
  const nextMatcher = allMatchers[currentIndex + 1];
  if (nextMatcher) {
    return nextMatcher;
  }
  return undefined;
}

/**
 * @param {Chunk[]} chunks - An array of processed and unprocessed chunks
 * @param {{[key: string]: boolean}} indices - An array of indices to prune
 * @returns {ProcessedChunk[]}
 */
function pruneChunks(chunks, indices) {
  const pruneableIndices = Object.keys(indices).map((i) => parseInt(i)).flatMap(i => {
    if (i >= 0 && i < chunks.length) {
      return [i];
    }
    return [];
  });

  return chunks.filter((chunk, i) => {
    if (pruneableIndices.includes(i)) {
      return false;
    }
    return true;
  });
}

/**
 * @param {Chunk[]} chunks - Array of chunks
 * @param {number} i - Array index
 * @returns {Map<number, Chunk>}
 */
function getSiblingChunks(chunks, i) {
  const siblingChunks = new Map([
    [i - 1, chunks[i - 1]],
    [i + 1, chunks[i + 1]],
  ]);

  if (i === 0) {
    siblingChunks.delete(i - 1);
  }

  if (i === chunks.length - 1) {
    siblingChunks.delete(i + 1);
  }
  return siblingChunks;
}

/**
 * @param {Chunk} chunk - Processed or unprocessed chunk
 * @returns {unknown}
 */
function getParam(chunk) {
  if (isProcessedChunk(chunk)) {
    return chunk.result;
  }
  return chunk;
}

/**
 * @param {Chunk} chunk - Processed or unprocessed chunk
 * @returns {boolean}
 */
function isProcessedChunk(chunk) {
  return typeof chunk === "object" && Object.hasOwn(chunk, "result");
}

// QUESTION: Should this be part of the library???
// QUESTION: Expose `isProcessedChunk` instead???
function getResultFromOnlyChunk(chunks) {
  if (chunks.length === 1 && isProcessedChunk(chunks[0])) {
    return chunks[0].result;
  }
  return chunks;
}

// TODO: Change export name from 'pare' to something else
export { getResultFromOnlyChunk as pare, parse };

