interface Cfg {
  modifiers: Map<RegExp, (match: string, str: string, cfg: Cfg) => string>;
  tokens: Map<string | RegExp, (...args: unknown[]) => unknown>;
}

type Chunk = ProcessedChunk | string;

interface ProcessedChunk {
  chunks: {
    [key: number]: Chunk,
  },
  func: () => unknown,
  result: unknown,
  symbol: string,
}

export {
  Cfg,
  Chunk,
  ProcessedChunk,
}
