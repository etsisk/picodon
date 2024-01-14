/**
 * @typedef {import("../index").Cfg} Cfg
 * @typedef {import("../index").Lexer} Lexer
 * @typedef {import("../index").Parser} Parser
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
        const regexFn = cfg.modifiers?.get(regex);
        if (regexFn) {
          return process(regexFn(match[0], str, cfg));
        }
      }
    }

    const chunked = chunkStr(lexers, str);
    const chunks = processChunked(chunked, cfg.rules.entries());
    return resolver(chunks);
  }
}

/**
 * @param {Lexer[]} lexers - Array of lexers
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
 * @template {[Lexer, Parser]} T
 * @param {IterableIterator<T>} rulesIter - Rules entries
 * @returns {Chunk[]}
 */
function processChunked(chunked, rulesIter) {
  const nextRule = rulesIter.next();

  if (nextRule.done) {
    return chunked;
  }

  /** @satisfies {[Lexer, Parser]} */
  const rule = nextRule.value;
  /** @satisfies {Lexer} */
  const lexer = nextRule.value[0];
  /** @type {Parser} */
  const fn = nextRule.value[1];
  const { indicesToPrune, unPrunedChunks } = chunked.reduce((result, chunk, i) => {
    // CONSIDER: Check if type of chunk is ProcessedChunk
    if ((typeof lexer === 'string' && chunk === lexer) || (typeof lexer !== 'string' && typeof chunk === 'string' && chunk.match(lexer))) {
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
            // CONSIDER: Include lexer as a third argument
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
  return processChunked(prunedChunks,  rulesIter);
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

