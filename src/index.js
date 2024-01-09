/**
 * @typedef {import("../index").Cfg} Cfg
 * @typedef {import("../index").ProcessedChunk} ProcessedChunk
 * @typedef {import("../index").Chunk} Chunk
 */

/**
 * @param {Cfg} cfg - Config object
 * @param {(chunks: Chunk[]) => unknown} [resolver=(n) => n] - Summarizing function
 * @returns {(str: string) => ProcessedChunk[] | unknown}
 */
function parse(cfg, resolver = (n) => n) {
  const modifiers = [...cfg.modifiers?.keys() ?? []];
  const lexers = [...cfg.rules?.keys() ?? []];

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

    const chunked = chunkStr(lexers, str);
    const chunks = processChunked(chunked, lexers[0], lexers, cfg.rules);
    return resolver(chunks);
  }
}

/**
 * @param {(string|RegExp)[]} lexers - Array of lexers
 * @param {string} str - String to parse
 * @returns {string[]}
 */
function chunkStr(lexers, str) {
  const keys = lexers.map((k) => {
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
 * @param {string | RegExp} lexer - The lexer to test against
 * @param {(string | RegExp)[]} lexers - The full list of lexers
 * @param {Cfg["rules"]} rules - The full list of rules
 * @returns {Chunk[]}
 */
function processChunked(chunked, lexer, lexers, rules) {
  const { indicesToPrune, unPrunedChunks } = chunked.reduce((result, chunk, i) => {
    // CONSIDER: Check if type of chunk is ProcessedChunk
    if ((typeof lexer === 'string' && chunk === lexer) || (typeof lexer !== 'string' && typeof chunk === 'string' && chunk.match(lexer))) {
      const fn = rules.get(lexer);
      const siblingChunks = getSiblingChunks(chunked, i);
      return {
        indicesToPrune: { ...result.indicesToPrune, [i - 1]: true, [i + 1]: true },
        // NOTE: https://github.com/microsoft/TypeScript/issues/10479
        unPrunedChunks: result.unPrunedChunks.concat([{
          chunks: {
            ...Object.fromEntries(siblingChunks),
            [i]: lexer,
          },
          fn,
          lexer,
          result: fn?.apply(
            null,
            // CONSIDER: Include matcher as a third argument
            Array.from(siblingChunks.values()).map((chunk) => getParam(chunk)),
          ),
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
  const nextLexer = getNextLexer(lexer, lexers);

  if (nextLexer) {
    return processChunked(prunedChunks, nextLexer, lexers, rules);
  }
  return prunedChunks;
}

/**
 * @param {string | RegExp} currentLexer - The current lexer
 * @param {(string | RegExp)[]} allLexers - The full list of lexers
 * @returns {string | RegExp | undefined}
 */
function getNextLexer(currentLexer, allLexers) {
  const currentIndex = allLexers.findIndex(m => m === currentLexer);
  const nextLexer = allLexers[currentIndex + 1];
  if (nextLexer) {
    return nextLexer;
  }
  return undefined;
}

/**
 * @param {Chunk[]} chunks - An array of processed and unprocessed chunks
 * @param {{[key: string]: boolean}} indices - An array of indices to prune
 * @returns {Chunk[]}
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
 * @returns {chunk is ProcessedChunk}
 */
function isProcessedChunk(chunk) {
  return typeof chunk === "object" && Object.hasOwn(chunk, "result");
}

/**
 * @param {Chunk[]} chunks - An array of processed chunks
 * @returns {ProcessedChunk[] | string | unknown}
 */
function getResultFromOnlyChunk(chunks) {
  if (chunks.length === 1) {
    return getParam(chunks[0]);
  }
  return chunks;
}

// CONSIDER: Export common regular expressions (e.g. matching parens) as helpers
export { getResultFromOnlyChunk as resolver, parse };

