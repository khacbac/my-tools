import { useMemo, useState } from 'react';
import { useStoredState } from '@/lib/storage';
import { formatVnd, parseVnd, splitByWeight } from '@/lib/split';
import { BANKS, bankName, buildVietQr } from '@/lib/vietqr';
import QrCanvas from '@/lib/QrCanvas';
import { renderBillImage } from './exportImage';

interface Person {
  id: string;
  name: string;
  weight: number;
}

interface SplitState {
  title: string;
  total: number;
  people: Person[];
}

interface BankAccount {
  bin: string;
  custom: boolean; // ngân hàng không có trong danh sách -> tự nhập BIN
  account: string;
  holder: string;
}

const newId = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_STATE: SplitState = {
  title: '',
  total: 0,
  people: [
    { id: 'p1', name: '', weight: 1 },
    { id: 'p2', name: '', weight: 1 },
  ],
};

const DEFAULT_BANK: BankAccount = { bin: '', custom: false, account: '', holder: '' };

export default function SplitBill() {
  const [state, setState] = useStoredState<SplitState>('split.state', DEFAULT_STATE);
  const [bank, setBank] = useStoredState<BankAccount>('bank.account', DEFAULT_BANK);
  const [flash, setFlash] = useState('');
  const [qrFor, setQrFor] = useState<string | null>(null);
  const { title, total, people } = state;

  const update = (patch: Partial<SplitState>) => setState((s) => ({ ...s, ...patch }));
  const updatePerson = (id: string, patch: Partial<Person>) =>
    update({ people: people.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const updateBank = (patch: Partial<BankAccount>) => setBank((b) => ({ ...b, ...patch }));

  const addPerson = () => update({ people: [...people, { id: newId(), name: '', weight: 1 }] });
  const removePerson = (id: string) => update({ people: people.filter((p) => p.id !== id) });

  const sumWeight = people.reduce((a, p) => a + (p.weight > 0 ? p.weight : 0), 0);
  // Giữ giá gốc, chỉ làm tròn tới 1đ (vài đồng chênh lệch tự dồn vào người đầu tiên)
  const shares = useMemo(
    () => splitByWeight(total, people.map((p) => p.weight), 1),
    [total, people],
  );

  const displayName = (p: Person, i: number) => p.name.trim() || `Bạn ${i + 1}`;
  const billTitle = title.trim() || 'Chia bill';
  const bankReady = /^\d{6}$/.test(bank.bin) && bank.account.trim() !== '';
  const bankLine = bankReady
    ? [bankName(bank.bin), bank.account.trim(), bank.holder.trim()].filter(Boolean).join(' · ')
    : undefined;

  const qrPayload = (i: number) =>
    bankReady
      ? buildVietQr({
          bin: bank.bin,
          account: bank.account.trim(),
          amount: shares[i].amount,
          note: `${displayName(people[i], i)} ${billTitle}`,
        })
      : undefined;

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 1500);
  };

  const copyText = async () => {
    const lines = people.map(
      (p, i) => `- ${displayName(p, i)} (${p.weight} suất): ${formatVnd(shares[i].amount)}đ`,
    );
    const text = [`${billTitle}: ${formatVnd(total)}đ`, ...lines, bankLine && `CK: ${bankLine}`]
      .filter(Boolean)
      .join('\n');
    await navigator.clipboard.writeText(text);
    showFlash('Copy text rồi ✓');
  };

  const makeImage = () =>
    renderBillImage({
      title: billTitle,
      total,
      sumWeight,
      bankLine,
      rows: people
        .map((p, i) => ({
          name: displayName(p, i),
          weight: p.weight,
          amount: shares[i].amount,
          qr: qrPayload(i),
        }))
        .filter((r) => r.amount > 0),
    });

  const copyImage = async () => {
    const blob = await makeImage();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showFlash('Copy ảnh rồi, dán vào nhóm thôi ✓');
  };

  const downloadImage = async () => {
    const url = URL.createObjectURL(await makeImage());
    const a = document.createElement('a');
    a.href = url;
    a.download = `${billTitle}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ready = total > 0 && sumWeight > 0;
  const qrIndex = people.findIndex((p) => p.id === qrFor);

  return (
    <div className="split">
      <label className="field">
        <span>Chia tiền gì đây?</span>
        <input
          value={title}
          placeholder="VD: Sân tháng 11, đi Đà Lạt..."
          onChange={(e) => update({ title: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Tổng bill (đ)</span>
        <input
          inputMode="numeric"
          className="money"
          value={total ? formatVnd(total) : ''}
          placeholder="2.400.000"
          onChange={(e) => update({ total: parseVnd(e.target.value) })}
        />
      </label>

      <table className="people">
        <thead>
          <tr>
            <th>Ai</th>
            <th title="Đi mấy buổi / góp mấy phần thì ghi bấy nhiêu">Suất</th>
            <th className="num">Góp</th>
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {people.map((p, i) => (
            <tr key={p.id}>
              <td>
                <input
                  value={p.name}
                  placeholder={`Bạn ${i + 1}`}
                  onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="weight"
                  value={p.weight}
                  onChange={(e) => updatePerson(p.id, { weight: Number(e.target.value) })}
                />
              </td>
              <td className="num">{formatVnd(shares[i]?.amount ?? 0)}</td>
              <td>
                <button
                  className={qrFor === p.id ? 'chip active' : 'chip'}
                  title={bankReady ? 'Xem QR của bạn này' : 'Nhập tài khoản nhận tiền trước đã'}
                  disabled={!bankReady || !shares[i]?.amount}
                  onClick={() => setQrFor(qrFor === p.id ? null : p.id)}
                >
                  QR
                </button>
              </td>
              <td>
                <button className="icon" title="Bỏ bạn này" onClick={() => removePerson(p.id)}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Tổng</td>
            <td>{sumWeight}</td>
            <td className="num">{formatVnd(shares.reduce((a, s) => a + s.amount, 0))}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>

      {bankReady && qrIndex >= 0 && shares[qrIndex]?.amount > 0 && (
        <div className="qr-box">
          <QrCanvas text={qrPayload(qrIndex)!} />
          <div>
            <strong>{displayName(people[qrIndex], qrIndex)}</strong> ·{' '}
            {formatVnd(shares[qrIndex].amount)}đ
          </div>
        </div>
      )}

      <div className="actions">
        <button onClick={addPerson}>+ Thêm bạn</button>
        {ready && <span className="hint">Mỗi suất: {formatVnd(Math.round(total / sumWeight))}đ</span>}
      </div>

      <div className="actions export">
        <button onClick={copyText} disabled={!ready}>
          Copy text
        </button>
        <button onClick={downloadImage} disabled={!ready}>
          Tải ảnh
        </button>
        <button className="primary" onClick={copyImage} disabled={!ready}>
          Copy ảnh
        </button>
      </div>
      {flash && <p className="flash">{flash}</p>}
      {!bankReady && <p className="hint">Nhập tài khoản nhận tiền bên dưới để có QR chuyển khoản.</p>}

      <details className="bank">
        <summary>
          Tài khoản nhận tiền
          <span className="hint"> · {bankLine ?? 'chưa nhập'}</span>
        </summary>
        <label className="field">
          <span>Ngân hàng</span>
          <select
            value={bank.custom ? 'other' : bank.bin}
            onChange={(e) =>
              e.target.value === 'other'
                ? updateBank({ custom: true, bin: '' })
                : updateBank({ custom: false, bin: e.target.value })
            }
          >
            <option value="">-- Chọn ngân hàng --</option>
            {BANKS.map((b) => (
              <option key={b.bin} value={b.bin}>
                {b.name}
              </option>
            ))}
            <option value="other">Khác (tự nhập mã BIN)</option>
          </select>
        </label>
        {bank.custom && (
          <label className="field">
            <span>Mã BIN ngân hàng (6 số)</span>
            <input
              inputMode="numeric"
              maxLength={6}
              value={bank.bin}
              onChange={(e) => updateBank({ bin: e.target.value.replace(/\D/g, '') })}
            />
          </label>
        )}
        <label className="field">
          <span>Số tài khoản</span>
          <input
            inputMode="numeric"
            value={bank.account}
            onChange={(e) => updateBank({ account: e.target.value.replace(/\s/g, '') })}
          />
        </label>
        <label className="field">
          <span>Tên chủ tài khoản</span>
          <input
            value={bank.holder}
            placeholder="NGUYEN VAN A"
            onChange={(e) => updateBank({ holder: e.target.value.toUpperCase() })}
          />
        </label>
      </details>
    </div>
  );
}
