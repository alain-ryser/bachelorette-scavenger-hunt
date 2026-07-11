/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REMOTE_CMS_URL?: string;
  readonly VITE_REMOTE_CMS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface BarcodeDetectorResult {
  rawValue?: string;
}

interface BarcodeDetector {
  detect(source: CanvasImageSource | HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetector;
}

interface Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}
