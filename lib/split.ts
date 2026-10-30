export interface Share {
  weight: number;
  amount: number;
}

/**
 * Chia `total` theo trọng số, làm tròn mỗi phần tới `step`.
 * Phần chênh lệch do làm tròn dồn vào người ở vị trí `remainderTo`,
 * để tổng các phần luôn đúng bằng `total`.
 */
export function splitByWeight(
  total: number,
  weights: number[],
  step = 1000,
  remainderTo = 0,
): Share[] {
  const clean = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  if (sum === 0 || total <= 0) return clean.map((weight) => ({ weight, amount: 0 }));

  const shares = clean.map((weight) => ({
    weight,
    amount: Math.round((total * weight) / sum / step) * step,
  }));

  const diff = total - shares.reduce((a, s) => a + s.amount, 0);
  if (diff !== 0) {
    // Người nhận phần lẻ phải có trọng số > 0; nếu không thì dồn cho người đóng nhiều nhất
    const target =
      shares[remainderTo]?.weight > 0
        ? remainderTo
        : shares.reduce((best, s, i) => (s.weight > shares[best].weight ? i : best), 0);
    shares[target].amount += diff;
  }
  return shares;
}

export const formatVnd = (n: number) => n.toLocaleString('vi-VN');

export const parseVnd = (s: string) => Number(s.replace(/\D/g, '')) || 0;
