interface Cfg {
  modifiers: Map<RegExp, (match: string, str: string, cfg: Cfg) => string>;
  tokens: Map<string | RegExp, (...args: unknown[]) => unknown>;
}

type Chunk = ProcessedChunk | string;
type Matcher = RegExp | string;

interface ProcessedChunk {
  chunks: {
    [key: number]: Chunk | Matcher,
  },
  fn: (...args: unknown[]) => unknown,
  matcher: Matcher,
  result: unknown,
}

export {
  Cfg,
  Chunk,
  Matcher,
  ProcessedChunk,
}
