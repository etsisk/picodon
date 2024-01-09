interface Cfg {
  modifiers: Map<RegExp, (match: string, str: string, cfg: Cfg) => string>;
  rules: Map<string | RegExp, (...args: unknown[]) => unknown>;
}

type Chunk = ProcessedChunk | string;
type Lexer = RegExp | string;

interface ProcessedChunk {
  chunks: {
    [key: number]: Chunk | Lexer,
  },
  fn: (...args: unknown[]) => unknown,
  lexer: Lexer,
  result: unknown,
}

export {
  Cfg,
  Chunk,
  Matcher,
  ProcessedChunk,
}
