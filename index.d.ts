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
  Chunk,
  ProcessedChunk,
}
