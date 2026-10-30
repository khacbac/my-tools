import { describe, expect, it } from 'vitest';
import { splitByWeight } from './split';

const amounts = (...args: Parameters<typeof splitByWeight>) =>
  splitByWeight(...args).map((s) => s.amount);

describe('splitByWeight', () => {
  it('chia đúng tỉ lệ khi chia hết', () => {
    expect(amounts(2_400_000, [1, 2, 4, 3, 2])).toEqual([200_000, 400_000, 800_000, 600_000, 400_000]);
  });

  it('làm tròn tới 1.000đ và dồn phần lẻ để tổng khớp', () => {
    const res = amounts(1_000_000, [1, 1, 1]);
    expect(res.reduce((a, b) => a + b, 0)).toBe(1_000_000);
    expect(res).toEqual([334_000, 333_000, 333_000]);
  });

  it('dồn phần lẻ vào người được chọn', () => {
    expect(amounts(1_000_000, [1, 1, 1], 1000, 2)).toEqual([333_000, 333_000, 334_000]);
  });

  it('người trọng số 0 trả 0, phần lẻ không dồn vào họ', () => {
    const res = amounts(1_000_000, [0, 1, 2], 1000, 0);
    expect(res[0]).toBe(0);
    expect(res.reduce((a, b) => a + b, 0)).toBe(1_000_000);
  });

  it('không có trọng số -> tất cả 0', () => {
    expect(amounts(500_000, [0, 0])).toEqual([0, 0]);
  });
});
