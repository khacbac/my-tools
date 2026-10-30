import { useMemo, useState, type CSSProperties } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ImageIcon,
  Landmark,
  Minus,
  Plus,
  QrCode,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useStoredState } from '@/lib/storage';
import { formatVnd, parseVnd, splitByWeight } from '@/lib/split';
import { BANKS, bankName, buildVietQr } from '@/lib/vietqr';
import QrCanvas from '@/lib/QrCanvas';
import { renderBillImage } from './exportImage';
import { DEBT_POEM } from './poem';

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

// Màu avatar cố định theo id, để mỗi người giữ 1 màu dù đổi tên
const hueOf = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export default function SplitBill() {
  const [state, setState] = useStoredState<SplitState>('split.state', DEFAULT_STATE);
  const [bank, setBank] = useStoredState<BankAccount>('bank.account', DEFAULT_BANK);
  const [flash, setFlash] = useState('');
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const { title, total, people } = state;

  const update = (patch: Partial<SplitState>) => setState((s) => ({ ...s, ...patch }));
  const updatePerson = (id: string, patch: Partial<Person>) =>
    update({ people: people.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const updateBank = (patch: Partial<BankAccount>) => setBank((b) => ({ ...b, ...patch }));

  const addPerson = () => update({ people: [...people, { id: newId(), name: '', weight: 1 }] });
  const removePerson = (id: string) => update({ people: people.filter((p) => p.id !== id) });
  const stepWeight = (p: Person, delta: number) =>
    updatePerson(p.id, { weight: Math.max(0, Math.round((p.weight + delta) * 100) / 100) });

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
    setTimeout(() => setFlash(''), 1800);
  };

  const copyText = async () => {
    const lines = people.map(
      (p, i) => `- ${displayName(p, i)} (${p.weight} suất): ${formatVnd(shares[i].amount)}đ`,
    );
    const text = [
      `${billTitle}: ${formatVnd(total)}đ`,
      '',
      ...DEBT_POEM.map((l) => `📢 ${l}`),
      '',
      ...lines,
      bankLine && `CK: ${bankLine}`,
    ]
      .filter((l) => l !== undefined)
      .join('\n');
    await navigator.clipboard.writeText(text);
    showFlash('Đã copy text');
  };

  const makeImage = () =>
    renderBillImage({
      title: billTitle,
      total,
      sumWeight,
      bankLine,
      poem: DEBT_POEM,
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
    showFlash('Đã copy ảnh, dán vào nhóm thôi');
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

  return (
    <div className="split">
      <section className="hero">
        <input
          className="hero-title"
          value={title}
          placeholder="Chia tiền gì đây?"
          onChange={(e) => update({ title: e.target.value })}
        />
        <div className="hero-total">
          <input
            inputMode="numeric"
            value={total ? formatVnd(total) : ''}
            placeholder="0"
            onChange={(e) => update({ total: parseVnd(e.target.value) })}
          />
          <span>đ</span>
        </div>
        <div className="hero-meta">
          <span>{people.length} người</span>
          <span>{sumWeight} suất</span>
          {ready && <span>{formatVnd(Math.round(total / sumWeight))}đ / suất</span>}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Thành viên</h2>
          <button className="ghost" onClick={addPerson}>
            <UserPlus size={15} /> Thêm
          </button>
        </div>

        <ul className="members">
          {people.map((p, i) => {
            const amount = shares[i]?.amount ?? 0;
            const showQr = bankReady && qrFor === p.id && amount > 0;
            return (
              <li key={p.id} className="member" style={{ '--h': hueOf(p.id) } as CSSProperties}>
                <div className="member-row">
                  <span className="avatar">{initials(p.name) || i + 1}</span>
                  <div className="member-main">
                    <input
                      className="member-name"
                      value={p.name}
                      placeholder={`Bạn ${i + 1}`}
                      onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                    />
                    <div className="stepper" title="Đi mấy buổi / góp mấy phần thì ghi bấy nhiêu">
                      <button onClick={() => stepWeight(p, -1)} aria-label="Bớt 1 suất">
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={p.weight}
                        onChange={(e) => updatePerson(p.id, { weight: Number(e.target.value) })}
                      />
                      <button onClick={() => stepWeight(p, 1)} aria-label="Thêm 1 suất">
                        <Plus size={12} />
                      </button>
                      <span className="stepper-unit">suất</span>
                    </div>
                  </div>
                  <div className="member-side">
                    <span className={amount ? 'amount' : 'amount zero'}>{formatVnd(amount)}đ</span>
                    <div className="member-actions">
                      <button
                        className={qrFor === p.id ? 'icon-btn active' : 'icon-btn'}
                        title={bankReady ? 'Xem QR của bạn này' : 'Nhập tài khoản nhận tiền trước đã'}
                        disabled={!bankReady || !amount}
                        onClick={() => setQrFor(qrFor === p.id ? null : p.id)}
                      >
                        <QrCode size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Bỏ bạn này"
                        onClick={() => removePerson(p.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
                {showQr && (
                  <div className="member-qr">
                    <QrCanvas text={qrPayload(i)!} size={200} />
                    <span>Quét bằng app ngân hàng · đã điền sẵn {formatVnd(amount)}đ</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="poem">
        <span className="poem-tag">📢 Thơ réo nợ</span>
        {DEBT_POEM.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </section>

      <section className={bankOpen ? 'card bank open' : 'card bank'}>
        <button className="bank-head" onClick={() => setBankOpen(!bankOpen)}>
          <span className="bank-icon">
            <Landmark size={16} />
          </span>
          <span className="bank-text">
            <strong>Tài khoản nhận tiền</strong>
            <small>{bankLine ?? 'Nhập để có QR chuyển khoản'}</small>
          </span>
          <span className={bankReady ? 'pill ok' : 'pill warn'}>{bankReady ? 'Đã có' : 'Chưa nhập'}</span>
          <ChevronDown size={16} className="chevron" />
        </button>

        {bankOpen && (
          <div className="bank-body">
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
                <option value="">Chọn ngân hàng</option>
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
          </div>
        )}
      </section>

      <footer className="dock">
        {flash && (
          <div className="toast">
            <Check size={14} /> {flash}
          </div>
        )}
        <button className="btn" onClick={copyText} disabled={!ready} title="Copy dạng chữ">
          <Copy size={15} /> Text
        </button>
        <button className="btn" onClick={downloadImage} disabled={!ready} title="Tải ảnh PNG">
          <Download size={15} /> Tải
        </button>
        <button className="btn primary" onClick={copyImage} disabled={!ready}>
          <ImageIcon size={15} /> Copy ảnh
        </button>
      </footer>
    </div>
  );
}
