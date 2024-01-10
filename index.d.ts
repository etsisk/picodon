interface Cfg {
  modifiers?: Map<RegExp, (match: string, str: string, cfg: Cfg) => string>;
  rules: Map<string | RegExp, Parser>;
}

type Chunk = ProcessedChunk | string;
type Lexer = RegExp | string;
type Parser = (...args: never) => unknown;

interface ProcessedChunk {
  chunks: {
    [key: number]: Chunk | Lexer,
  },
  fn: Parser,
  lexer: Lexer,
  result: unknown,
}

export {
  Cfg,
  Chunk,
  Lexer,
  Parser,
  ProcessedChunk,
}
