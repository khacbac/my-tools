import QRCode from 'qrcode';

/**
 * Vẽ QR lên canvas tại (x, y), cạnh `size` px (đã gồm viền trắng 2 module).
 * Vẽ trực tiếp từ ma trận nên đồng bộ, dùng chung cho panel và ảnh export.
 */
export function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const margin = 2;
  const cell = size / (modules.size + margin * 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < modules.size; r++) {
    for (let c = 0; c < modules.size; c++) {
      if (modules.get(r, c)) {
        // +0.5 để các ô liền nhau không bị khe hở do làm tròn sub-pixel
        ctx.fillRect(x + (c + margin) * cell, y + (r + margin) * cell, cell + 0.5, cell + 0.5);
      }
    }
  }
}
