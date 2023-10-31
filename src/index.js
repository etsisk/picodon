/**
 * @typedef {import("../index").ProcessedChunk} ProcessedChunk
 * @typedef {import("../index").Chunk} Chunk
 */

/**
 * @param {Map<string | RegExp, (...args: unknown[]) => unknown>} cfg - Map of config for parsing
 * @param {(chunks: ProcessedChunk[]) => unknown} [sum=(n) => n] - Summarizing function
 * @returns {(str: string) => ProcessedChunk[] | unknown}
 */
function parse(cfg, sum = (n) => n) {
  const cfgKeys = [...cfg.keys()];
  return function process(str) {
    const regexKeys = cfgKeys.filter((key) => {
      if (key.test !== undefined) {
        return true;
      }
      return false;
    });

    for (let regex of regexKeys) {
      const match = str.match(regex);
      if (match) {
        const regexFunc = cfg.get(regex);
        return process(regexFunc(match[0], str, cfg));
      }
    }

    let chunks = chunkStr(cfgKeys, str);

    for (let [symbol, func] of cfg) {
      chunks = processChunksForSymbol(chunks, symbol, func);
    }

    return sum(chunks);
  };
}

/**
 * @param {(string|RegExp)[]} cfgKeys - Array of config key symbols
 * @param {string} str - String to parse
 * @returns {string[]}
 */
function chunkStr(cfgKeys, str) {
  const strKeys = cfgKeys.filter(key => typeof key === 'string');
  const keys = strKeys.map((k) => escapeRegExp(k)).join("|");
  const regex = new RegExp(`(${keys})`, "g");
  return str?.split(regex)?.map((chunk) => chunk.trim()) ?? [];
}

/**
 * @param {string} str - Unescaped string
 * @returns {string}
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {Chunk[]} chunks - Processed or unprocessed chunks
 * @param {string} symbol - String value from Map key
 * @param {(...args: unknown[]) => unknown} func - Chunk processor
 * @returns {Chunk[]}
 */
function processChunksForSymbol(chunks, symbol, func) {
  if (chunks.length === 0) {
    return [];
  }
  /** @type {ProcessedChunk[]} */
  const processedChunks = chunks.reduce(
    (processed, chunk, i) => {
      if (chunk !== symbol) {
        return processed;
      }
      const siblingChunks = getSiblingChunks(chunks, i);
      const processedChunk = {
        chunks: {
          ...Object.fromEntries(siblingChunks),
          [i]: symbol,
        },
        func,
        result: func.apply(
          null,
          Array.from(siblingChunks.values()).map((chunk) => getParam(chunk)),
        ),
        symbol,
      };

      return processed.concat([processedChunk]);
    },
    [],
  );

  return deDupeChunks(
    replaceChunksWithProcessedChunks(chunks, processedChunks),
  );
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

/**
 * @param {Chunk[]} chunks - An array of chunks
 * @returns {Chunk[]}
 */
function deDupeChunks(chunks) {
  return Array.from(new Set([...chunks]));
}

/**
 * @param {Chunk[]} chunks - Processed or unprocessed chunks
 * @param {ProcessedChunk[]} processedChunks - Processed chunks
 * @returns {Chunk[]} chunks - Processed or unprocessed chunks
 */
function replaceChunksWithProcessedChunks(chunks, processedChunks) {
  return chunks.flatMap((chunk, i) => {
    const foundChunk = findChunkFromIndex(processedChunks, i);
    if (foundChunk) {
      return [foundChunk];
    }
    return [chunk];
  }).filter((chunk) => chunk !== undefined);
}

/**
 * @param {ProcessedChunk[]} chunks - Chunks that have been processed
 * @param {number} chunkIndex - Index of original chunk
 * @returns {ProcessedChunk | undefined}
 */
function findChunkFromIndex(chunks, chunkIndex) {
  for (let processedChunk of chunks) {
    if (Object.keys(processedChunk.chunks).includes(String(chunkIndex))) {
      return processedChunk;
    }
  }
  return undefined;
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

//function parseV1(cfg) {
//  return function process(str) {
//const keys = [ ...cfg.keys() ];

//const exploded = keys.reduce((obj, key) => {
// if (obj.explode === undefined) {
// const fragments = str.split(key).flatMap(frag => [frag, key]).slice(0, -1);
//  obj.explode = fragments;
// }
//  return obj;
// }, { str });
//  return exploded.explode;
// }
//}

// function parseV2(cfg, summarize = (n) => n) {
//   return function process(str) {
//     let chunks = [str];
//     for (let [symbol, func] of cfg) {
//       chunks = splitChunks(symbol, chunks);
//       var fChunks = [func(...chunks)];
//     }
//
//     return summarize(fChunks);
//   }
// }

// function splitChunks(separator, chunks) {
//   return chunks.flatMap(chunk => chunk.split(separator));
// }
