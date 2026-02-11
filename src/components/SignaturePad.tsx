'use client';
import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onSignatureSave: (dataUrl: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  width?: number;
  height?: number;
}

export default function SignaturePad({
  onSignatureSave,
  onClear,
  disabled = false,
  width,
  height = 200,
}: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState<number>(width ?? 400);

  const handleClear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setIsEmpty(true);
      if (onClear) {
        onClear();
      }
    }
  };

  const handleSave = () => {
    if (sigPadRef.current && !isEmpty) {
      const dataUrl = sigPadRef.current.toDataURL('image/png');
      onSignatureSave(dataUrl);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  const handleEnd = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setIsEmpty(false);
    }
  };

  useEffect(() => {
    if (typeof width === 'number') {
      setCanvasWidth(width);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      // Leave some breathing room for borders/padding; also avoid tiny canvases.
      const next = Math.max(240, Math.floor(el.clientWidth));
      setCanvasWidth(next);
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full">
        <div className="border-2 border-gray-300 rounded-lg bg-white w-full overflow-hidden" style={{ height }}>
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            width: canvasWidth,
            height,
            className: 'signature-canvas',
          }}
          onBegin={handleBegin}
          onEnd={handleEnd}
          backgroundColor="#ffffff"
          penColor="#000000"
        />
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ล้างลายเซ็น
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || isEmpty}
          className="px-4 py-2 rounded-lg bg-[#0076c3] text-white hover:bg-[#005b99] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          บันทึกลายเซ็น
        </button>
      </div>
      
      {isEmpty && (
        <p className="text-sm text-gray-500 text-center">
          กรุณาเซ็นลายเซ็นของคุณในพื้นที่ด้านบน
        </p>
      )}
    </div>
  );
}
