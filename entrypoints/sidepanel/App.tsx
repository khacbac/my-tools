import { useStoredState } from '@/lib/storage';
import SplitBill from '@/tools/split/SplitBill';

// Thêm tiện ích mới: thêm 1 phần tử vào đây
const TOOLS = [{ id: 'split', name: 'Chia bill', Component: SplitBill }] as const;

export default function App() {
  const [toolId, setToolId] = useStoredState<string>('app.tool', TOOLS[0].id);
  const tool = TOOLS.find((t) => t.id === toolId) ?? TOOLS[0];

  return (
    <div className="app">
      <nav className="tabs">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={t.id === tool.id ? 'tab active' : 'tab'}
            onClick={() => setToolId(t.id)}
          >
            {t.name}
          </button>
        ))}
      </nav>
      <main>
        <tool.Component />
      </main>
    </div>
  );
}
