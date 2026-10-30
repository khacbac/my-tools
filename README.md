# My Tools

Bộ tiện ích nhỏ dùng cá nhân, dạng Chrome extension (Side Panel). WXT + React + TS.

## Chạy

```bash
pnpm install
pnpm build        # ra dist/ -> chrome://extensions > Load unpacked
pnpm dev          # mở Chrome dev có hot reload
pnpm test
```

## Tiện ích

- **Chia bill** (`tools/split`): chia bill theo số suất mỗi người (số buổi, số phần, ...), giữ giá gốc (không làm tròn nghìn). Dữ liệu tự lưu.

## Thêm tiện ích mới

1. Tạo component trong `tools/<ten>/`.
2. Thêm vào mảng `TOOLS` trong `entrypoints/sidepanel/App.tsx`.
3. Logic tính toán để ở `lib/` (tách khỏi UI, có test).
