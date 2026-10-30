import { formatVnd } from '@/lib/split';
import { drawQr } from '@/lib/qr';

export interface ExportRow {
  name: string;
  weight: number;
  amount: number;
  qr?: string; // payload VietQR; không có thì card chỉ hiện tên + số tiền
}

export interface ExportData {
  title: string;
  total: number;
  sumWeight: number;
  bankLine?: string; // "Vietcombank · 0123456789 · NGUYEN VAN A"
  poem?: string[]; // thơ réo nợ, in thành băng rôn nổi bật
  rows: ExportRow[];
}

const W = 560;
const PAD = 24;
const GAP = 12;
const COLS = 2;
const CARD_W = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const QR_SIZE = CARD_W - 32;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const C = {
  bg: '#f3f4f6',
  card: '#ffffff',
  fg: '#111827',
  muted: '#6b7280',
  accent: '#2563eb',
  jokeBg: '#facc15',
  jokeFg: '#7c2d12',
};

const JOKE_FONT = `800 19px ${FONT}`;
const JOKE_LINE = 26;
const JOKE_PAD = 14;

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
  return s + '…';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Vẽ phiếu chia bill (danh sách + QR từng người) thành ảnh PNG */
export async function renderBillImage(data: ExportData): Promise<Blob> {
  const hasQr = data.rows.some((r) => r.qr);
  const cardH = hasQr ? 16 + 20 + 26 + 10 + QR_SIZE + 16 : 16 + 20 + 26 + 14;
  const gridRows = Math.ceil(data.rows.length / COLS);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Đo trước số dòng của băng rôn để tính chiều cao ảnh
  ctx.font = JOKE_FONT;
  const jokeLines = (data.poem ?? []).flatMap((l) => wrapText(ctx, l, W - PAD * 2 - JOKE_PAD * 2));
  const jokeH = jokeLines.length ? jokeLines.length * JOKE_LINE + JOKE_PAD * 2 + 16 : 0;

  const headerH = 30 + 22 + (data.bankLine ? 26 : 0) + 16;
  const footerH = hasQr ? 34 : 12;
  const H = PAD + headerH + jokeH + gridRows * cardH + (gridRows - 1) * GAP + footerH + PAD;

  const scale = 2; // ảnh nét khi xem trên điện thoại
  canvas.width = W * scale; // đổi kích thước canvas sẽ reset context, nên scale sau bước này
  canvas.height = H * scale;
  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Header
  let y = PAD;
  ctx.fillStyle = C.fg;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(fitText(ctx, data.title, W - PAD * 2), PAD, y);
  y += 30;
  ctx.fillStyle = C.muted;
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText(`Tổng bill ${formatVnd(data.total)}đ · ${data.sumWeight} suất`, PAD, y);
  y += 22;
  if (data.bankLine) {
    ctx.fillStyle = C.fg;
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText(fitText(ctx, `Chuyển khoản: ${data.bankLine}`, W - PAD * 2), PAD, y);
    y += 26;
  }
  y += 16;

  // Băng rôn thơ réo nợ: nền vàng, chữ đậm, nghiêng nhẹ cho "lầy"
  if (jokeLines.length) {
    const boxH = jokeH - 16;
    ctx.save();
    ctx.translate(W / 2, y + boxH / 2);
    ctx.rotate(-0.012);
    ctx.fillStyle = C.jokeBg;
    ctx.beginPath();
    ctx.roundRect(-(W / 2 - PAD), -boxH / 2, W - PAD * 2, boxH, 10);
    ctx.fill();
    ctx.fillStyle = C.jokeFg;
    ctx.font = JOKE_FONT;
    jokeLines.forEach((line, i) => {
      const lw = ctx.measureText(line).width;
      ctx.fillText(line, -lw / 2, -boxH / 2 + JOKE_PAD + i * JOKE_LINE + 2);
    });
    ctx.restore();
    y += jokeH;
  }

  // Cards
  data.rows.forEach((row, i) => {
    const x = PAD + (i % COLS) * (CARD_W + GAP);
    const cy = y + Math.floor(i / COLS) * (cardH + GAP);

    ctx.fillStyle = C.card;
    ctx.beginPath();
    ctx.roundRect(x, cy, CARD_W, cardH, 12);
    ctx.fill();

    ctx.fillStyle = C.fg;
    ctx.font = `600 16px ${FONT}`;
    const suat = `${row.weight} suất`;
    ctx.fillText(fitText(ctx, row.name, CARD_W - 32 - 60), x + 16, cy + 16);
    ctx.fillStyle = C.muted;
    ctx.font = `400 13px ${FONT}`;
    ctx.fillText(suat, x + CARD_W - 16 - ctx.measureText(suat).width, cy + 18);

    ctx.fillStyle = C.accent;
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(`${formatVnd(row.amount)}đ`, x + 16, cy + 36);

    if (row.qr) drawQr(ctx, row.qr, x + 16, cy + 16 + 20 + 26 + 10, QR_SIZE);
  });

  if (hasQr) {
    ctx.fillStyle = C.muted;
    ctx.font = `400 12px ${FONT}`;
    const note = 'Quét QR bằng app ngân hàng, số tiền đã điền sẵn';
    ctx.fillText(note, (W - ctx.measureText(note).width) / 2, H - PAD - 16);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh'))), 'image/png'),
  );
}
