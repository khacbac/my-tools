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
const FONT = "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif";

const C = {
  bg: '#f4f5fa',
  card: '#ffffff',
  border: '#e6e8ef',
  fg: '#16181d',
  muted: '#6b7080',
  accent: '#6366f1',
  chip: '#f1f2f7',
  poemBg: '#fde047',
  poemFg: '#713f12',
  tagBg: '#ef4444',
};

const POEM_FONT = `700 17px ${FONT}`;
const POEM_LINE = 26;
const POEM_PAD = 20;

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

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string, fg: string) {
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 22, 11);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, x + 9, y + 4);
  return w;
}

/** Vẽ phiếu chia bill (danh sách + QR từng người) thành ảnh PNG */
export async function renderBillImage(data: ExportData): Promise<Blob> {
  // Canvas không tự chờ webfont, phải load trước kẻo vẽ ra font hệ thống
  await Promise.all(
    [400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 16px 'Be Vietnam Pro'`)),
  );

  const hasQr = data.rows.some((r) => r.qr);
  const cardH = hasQr ? 16 + 22 + 30 + 12 + QR_SIZE + 16 : 16 + 22 + 30 + 12;
  const gridRows = Math.ceil(data.rows.length / COLS);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Đo trước số dòng của thơ để tính chiều cao ảnh
  ctx.font = POEM_FONT;
  const poemLines = (data.poem ?? []).flatMap((l) => wrapText(ctx, l, W - PAD * 2 - POEM_PAD * 2));
  const poemBoxH = poemLines.length ? poemLines.length * POEM_LINE + POEM_PAD * 2 : 0;

  const heroH = 20 + 20 + 44 + 10 + 22 + (data.bankLine ? 40 : 0) + 20;
  const H =
    PAD +
    heroH +
    20 +
    (poemBoxH ? poemBoxH + 24 : 0) +
    gridRows * cardH +
    (gridRows - 1) * GAP +
    (hasQr ? 40 : 8) +
    PAD;

  const scale = 2; // ảnh nét khi xem trên điện thoại
  canvas.width = W * scale; // đổi kích thước canvas sẽ reset context, nên scale sau bước này
  canvas.height = H * scale;
  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Hero gradient: tiêu đề + tổng bill
  const hx = PAD;
  const hw = W - PAD * 2;
  let y = PAD;
  const grad = ctx.createLinearGradient(hx, y, hx + hw, y + heroH);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(0.55, '#8b5cf6');
  grad.addColorStop(1, '#d946ef');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(hx, y, hw, heroH, 20);
  ctx.fill();

  let hy = y + 20;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `500 15px ${FONT}`;
  ctx.fillText(fitText(ctx, data.title, hw - 40), hx + 20, hy);
  hy += 20;
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 38px ${FONT}`;
  ctx.fillText(`${formatVnd(data.total)}đ`, hx + 20, hy);
  hy += 44 + 10;
  ctx.font = `500 12px ${FONT}`;
  let px = hx + 20;
  px += pill(ctx, `${data.rows.length} người`, px, hy, 'rgba(255,255,255,0.2)', '#fff') + 6;
  px += pill(ctx, `${data.sumWeight} suất`, px, hy, 'rgba(255,255,255,0.2)', '#fff') + 6;
  if (data.sumWeight > 0) {
    pill(ctx, `${formatVnd(Math.round(data.total / data.sumWeight))}đ / suất`, px, hy, 'rgba(255,255,255,0.2)', '#fff');
  }
  hy += 22;
  if (data.bankLine) {
    hy += 14;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.roundRect(hx + 14, hy - 4, hw - 28, 30, 10);
    ctx.fill();
    ctx.fillStyle = C.fg;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(fitText(ctx, `🏦  ${data.bankLine}`, hw - 56), hx + 26, hy + 3);
  }
  y += heroH + 20;

  // Sticker thơ réo nợ: nền vàng, nghiêng nhẹ, có tag đỏ
  if (poemBoxH) {
    y += 8;
    ctx.save();
    ctx.translate(W / 2, y + poemBoxH / 2);
    ctx.rotate(-0.015);
    ctx.shadowColor = 'rgba(202,138,4,0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = C.poemBg;
    ctx.beginPath();
    ctx.roundRect(-hw / 2, -poemBoxH / 2, hw, poemBoxH, 14);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.poemFg;
    ctx.font = POEM_FONT;
    poemLines.forEach((line, i) => {
      const lw = ctx.measureText(line).width;
      ctx.fillText(line, -lw / 2, -poemBoxH / 2 + POEM_PAD + i * POEM_LINE);
    });
    ctx.font = `800 11px ${FONT}`;
    const tag = '📢 THƠ RÉO NỢ';
    const tw = ctx.measureText(tag).width + 20;
    ctx.fillStyle = C.tagBg;
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -poemBoxH / 2 - 11, tw, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(tag, -tw / 2 + 10, -poemBoxH / 2 - 6);
    ctx.restore();
    y += poemBoxH + 16;
  }

  // Thẻ từng người
  data.rows.forEach((row, i) => {
    const x = PAD + (i % COLS) * (CARD_W + GAP);
    const cy = y + Math.floor(i / COLS) * (cardH + GAP);

    ctx.fillStyle = C.card;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, cy, CARD_W, cardH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = `500 12px ${FONT}`;
    const suat = `${row.weight} suất`;
    const sw = ctx.measureText(suat).width + 18;
    pill(ctx, suat, x + CARD_W - 16 - sw, cy + 16, C.chip, C.muted);

    ctx.fillStyle = C.fg;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(fitText(ctx, row.name, CARD_W - 32 - sw - 8), x + 16, cy + 18);

    ctx.fillStyle = C.accent;
    ctx.font = `800 22px ${FONT}`;
    ctx.fillText(`${formatVnd(row.amount)}đ`, x + 16, cy + 16 + 26);

    if (row.qr) drawQr(ctx, row.qr, x + 16, cy + 16 + 22 + 30 + 12, QR_SIZE);
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
