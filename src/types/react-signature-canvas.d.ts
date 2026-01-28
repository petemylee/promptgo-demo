declare module 'react-signature-canvas' {
  import { Component } from 'react';

  export interface SignatureCanvasProps {
    canvasProps?: {
      width?: number;
      height?: number;
      className?: string;
    };
    backgroundColor?: string;
    penColor?: string;
    onBegin?: () => void;
    onEnd?: () => void;
  }

  export interface SignatureCanvasInstance {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromDataURL(dataURL: string): void;
    getCanvas(): HTMLCanvasElement;
  }

  export default class SignatureCanvas extends Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromDataURL(dataURL: string): void;
    getCanvas(): HTMLCanvasElement;
  }
}
