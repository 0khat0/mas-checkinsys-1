import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  value,
  width = 2,
  height = 100,
  displayValue = true,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: 16,
          textMargin: 8,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 10,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, width, height, displayValue]);

  if (!value) {
    return (
      <div className="text-center text-white/50 py-8">
        <p>No barcode available</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded-lg bg-white"
      />
      <div className="mt-2 text-center">
        <p className="text-white/70 text-sm font-mono">{value}</p>
        <p className="text-white/50 text-xs mt-1">
          Show this barcode to staff for check-in
        </p>
      </div>
    </div>
  );
};

export default BarcodeGenerator; 