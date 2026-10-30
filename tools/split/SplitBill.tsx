import { useMemo, useState } from 'react';
import { useStoredState } from '@/lib/storage';
import { formatVnd, parseVnd, splitByWeight } from '@/lib/split';

interface Person {
  id: string;
  name: string;
  weight: number;
}

interface SplitState {
  title: string;
  total: number;
  people: Person[];
  payerId: string; // người nhận phần lẻ do làm tròn (thường là người đứng ra trả)
}

const newId = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_STATE: SplitState = {
  title: '',
  total: 0,
  people: [
    { id: 'p1', name: '', weight: 1 },
    { id: 'p2', name: '', weight: 1 },
  ],
  payerId: 'p1',
};

export default function SplitBill() {
  const [state, setState] = useStoredState<SplitState>('split.state', DEFAULT_STATE);
  const [copied, setCopied] = useState(false);
  const { title, total, people, payerId } = state;

  const update = (patch: Partial<SplitState>) => setState((s) => ({ ...s, ...patch }));
  const updatePerson = (id: string, patch: Partial<Person>) =>
    update({ people: people.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const addPerson = () => update({ people: [...people, { id: newId(), name: '', weight: 1 }] });
  const removePerson = (id: string) => {
    const rest = people.filter((p) => p.id !== id);
    update({ people: rest, payerId: id === payerId ? (rest[0]?.id ?? '') : payerId });
  };

  const sumWeight = people.reduce((a, p) => a + (p.weight > 0 ? p.weight : 0), 0);
  const shares = useMemo(
    () =>
      splitByWeight(
        total,
        people.map((p) => p.weight),
        1000,
        Math.max(0, people.findIndex((p) => p.id === payerId)),
      ),
    [total, people, payerId],
  );

  const displayName = (p: Person, i: number) => p.name.trim() || `Bạn ${i + 1}`;

  const copyResult = async () => {
    const lines = people.map(
      (p, i) => `- ${displayName(p, i)} (${p.weight} suất): ${formatVnd(shares[i].amount)}đ`,
    );
    const text = [`${title.trim() || 'Chia bill'}: ${formatVnd(total)}đ`, ...lines].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
            <th title="Làm tròn tới nghìn, dư thiếu bao nhiêu thì người này gánh">Gánh lẻ</th>
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
              <td className="center">
                <input
                  type="radio"
                  name="payer"
                  checked={p.id === payerId}
                  onChange={() => update({ payerId: p.id })}
                />
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

      <div className="actions">
        <button onClick={addPerson}>+ Thêm bạn</button>
        <button className="primary" onClick={copyResult} disabled={!total || !sumWeight}>
          {copied ? 'Copy rồi ✓' : 'Copy gửi nhóm'}
        </button>
      </div>

      {sumWeight > 0 && total > 0 && (
        <p className="hint">Mỗi suất ≈ {formatVnd(Math.round(total / sumWeight))}đ</p>
      )}
    </div>
  );
}
