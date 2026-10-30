/**
 * Tạo nội dung QR chuyển khoản theo chuẩn VietQR (EMVCo / NAPAS 247).
 * App ngân hàng nào ở VN cũng quét được, tự điền số tài khoản, số tiền, nội dung.
 */

export interface Bank {
  bin: string;
  name: string;
}

// BIN theo danh sách NAPAS. Ngân hàng không có ở đây thì chọn "Khác" và tự nhập BIN.
export const BANKS: Bank[] = [
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970405', name: 'Agribank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970422', name: 'MB Bank' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970423', name: 'TPBank' },
  { bin: '970403', name: 'Sacombank' },
  { bin: '970437', name: 'HDBank' },
  { bin: '970441', name: 'VIB' },
  { bin: '970443', name: 'SHB' },
  { bin: '970431', name: 'Eximbank' },
  { bin: '970426', name: 'MSB' },
  { bin: '970448', name: 'OCB' },
  { bin: '970440', name: 'SeABank' },
  { bin: '970449', name: 'LPBank' },
  { bin: '970428', name: 'Nam A Bank' },
  { bin: '970409', name: 'Bac A Bank' },
  { bin: '970454', name: 'Viet Capital Bank' },
  { bin: '970433', name: 'VietBank' },
  { bin: '970425', name: 'ABBANK' },
  { bin: '970452', name: 'Kienlongbank' },
  { bin: '970412', name: 'PVcomBank' },
  { bin: '970424', name: 'Shinhan Bank' },
  { bin: '546034', name: 'Cake by VPBank' },
  { bin: '546035', name: 'Ubank by VPBank' },
  { bin: '963388', name: 'Timo' },
];

export const bankName = (bin: string) => BANKS.find((b) => b.bin === bin)?.name ?? `BIN ${bin}`;

const tlv = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — checksum bắt buộc của EMVCo QR */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Bỏ dấu + ký tự đặc biệt, vì nhiều ngân hàng không nhận nội dung có dấu */
export function toTransferNote(s: string, max = 50): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

export function buildVietQr(opts: { bin: string; account: string; amount?: number; note?: string }): string {
  const beneficiary = tlv('00', opts.bin) + tlv('01', opts.account);
  const merchant = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA');
  const amount = opts.amount && opts.amount > 0 ? Math.round(opts.amount) : 0;
  const note = opts.note ? toTransferNote(opts.note) : '';

  const payload =
    tlv('00', '01') +
    tlv('01', amount ? '12' : '11') + // 12 = QR động (có số tiền), 11 = QR tĩnh
    tlv('38', merchant) +
    tlv('53', '704') + // VND
    (amount ? tlv('54', String(amount)) : '') +
    tlv('58', 'VN') +
    (note ? tlv('62', tlv('08', note)) : '') +
    '6304';
  return payload + crc16(payload);
}
