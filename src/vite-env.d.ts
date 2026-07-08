/// <reference types="vite/client" />

interface BarcodeDetectorOptions {
  formats?: string[];
}

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetector {
  detect(image: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: BarcodeDetectorOptions): BarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

interface Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}
