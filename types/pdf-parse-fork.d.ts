declare module 'pdf-parse-fork' {
  interface PDFParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }

  function pdfParse(buffer: Buffer): Promise<PDFParseResult>;

  export default pdfParse;
}
