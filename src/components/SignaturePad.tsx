'use client';
import { useRef, useState } from 'react';
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
  width = 400,
  height = 200,
}: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

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

  return (
    <div className="space-y-4">
      <div className="border-2 border-gray-300 rounded-lg bg-white" style={{ width, height }}>
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            width,
            height,
            className: 'signature-canvas',
          }}
          onBegin={handleBegin}
          onEnd={handleEnd}
          backgroundColor="#ffffff"
          penColor="#000000"
        />
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
