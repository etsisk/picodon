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

declare function getResultFromOnlyChunk(chunks: Chunk[]): ProcessedChunk[] | string | unknown;

export function parse(cfg: Cfg, resolver?: ((chunks: Chunk[]) => unknown) | undefined): (str: string) => ProcessedChunk[] | unknown;

export {
  Cfg,
  Chunk,
  Lexer,
  Parser,
  ProcessedChunk,
  getResultFromOnlyChunk as resolver,
}
