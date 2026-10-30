import { useEffect, useRef } from 'react';
import { drawQr } from './qr';

export default function QrCanvas({ text, size = 220 }: { text: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    drawQr(ctx, text, 0, 0, size);
  }, [text, size]);

  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
