declare module 'qrcode' {
  interface QRCodeOptions {
    version?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeOptions
  ): Promise<HTMLCanvasElement>;

  function toDataURL(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;

  function toString(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;

  function toFile(
    path: string,
    text: string,
    options?: QRCodeOptions
  ): Promise<void>;

  function toFileStream(
    stream: NodeJS.WritableStream,
    text: string,
    options?: QRCodeOptions
  ): Promise<void>;

  export { toCanvas, toDataURL, toString, toFile, toFileStream };
}