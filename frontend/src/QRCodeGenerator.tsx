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

  // Download QR code as PNG
  const handleSave = () => {
    const svg = document.getElementById(svgId) as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = size || 160;
    canvas.height = size || 160;
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    img.onload = () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "MAS Member QR.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
  };

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
        <button
          onClick={handleSave}
          className="mt-6 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          Save Image
        </button>
      </div>
    </div>
  );
};

export default QRCodeGenerator; 