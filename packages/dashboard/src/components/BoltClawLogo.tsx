import { useEffect, useRef } from "react";

export function BoltClawLogo({ className = "", size = 40 }: { className?: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);
        // Saturation: 0 = grey/white, 1 = fully coloured
        const saturation = max > 0 ? (max - min) / max : 0;
        // Only touch low-saturation (grey/white) pixels with high brightness
        if (min > 200 && saturation < 0.15) {
          // Smooth fade — brighter pixels become more transparent
          const brightness = min / 255;
          data[i + 3] = Math.round(255 * (1 - brightness) * 6);
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };
    img.src = "/logo.png";
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
      aria-label="BoltClaw"
    />
  );
}
