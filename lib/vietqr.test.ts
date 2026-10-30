import { describe, expect, it } from 'vitest';
import { buildVietQr, crc16, toTransferNote } from './vietqr';

describe('crc16', () => {
  it('khớp giá trị chuẩn CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
});

describe('toTransferNote', () => {
  it('bỏ dấu và ký tự đặc biệt', () => {
    expect(toTransferNote('Đức - Sân tháng 11!')).toBe('Duc San thang 11');
  });
});

describe('buildVietQr', () => {
  it('tạo payload đúng cấu trúc, có số tiền và nội dung', () => {
    const qr = buildVietQr({ bin: '970436', account: '0123456789', amount: 200000, note: 'An San' });
    expect(qr).toBe(
      '000201010212' +
        '38540010A00000072701240006970436011001234567890208QRIBFTTA' +
        '5303704' +
        '5406200000' +
        '5802VN' +
        '62100806An San' +
        '6304' +
        crc16(qr.slice(0, -4)),
    );
  });

  it('không có số tiền -> QR tĩnh, bỏ trường 54', () => {
    const qr = buildVietQr({ bin: '970436', account: '0123456789' });
    expect(qr.startsWith('000201010211')).toBe(true);
    expect(qr).not.toContain('5406');
  });
});
