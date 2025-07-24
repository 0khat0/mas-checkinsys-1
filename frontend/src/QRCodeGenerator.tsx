import type { FC } from "react";
import QRCode from "react-qr-code";

interface QRCodeGeneratorProps {
  data: object;
  size?: number;
}

const QRCodeGenerator: FC<QRCodeGeneratorProps> = ({ data, size = 160 }) => {
  const svgId = "mas-qr-svg";
  if (!data) return <div className="text-gray-400">No QR code available</div>;
  const value = JSON.stringify(data);

  return (
    <div className="w-full flex justify-center">
      <div
        className="bg-black/80 backdrop-blur-lg rounded-xl border border-white/10 shadow-2xl flex flex-col items-center py-6 px-4 transition-transform duration-200 hover:scale-105 max-w-[300px] w-full sm:my-0 my-2"
        style={{ boxShadow: '0 0 24px 4px #a78bfa55' }}
      >
        <span className="text-xl font-bold text-white mb-4 tracking-wider">QR Code</span>
        <div className="rounded-xl p-2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-lg flex items-center justify-center">
          <QRCode id={svgId} value={value} size={size} bgColor="#18181b" fgColor="#fff" />
        </div>
        <div className="mt-3 text-xs text-purple-200 text-center">
          Long-press the QR code to save it to your Photos.
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator; 