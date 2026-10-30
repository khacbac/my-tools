import { useEffect, useRef, useState } from 'react';

/**
 * useState được lưu vào chrome.storage.local — đóng side panel mở lại vẫn còn dữ liệu.
 */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    browser.storage.local.get(key).then((res) => {
      if (res[key] !== undefined) setValue(res[key] as T);
      loaded.current = true;
    });
  }, [key]);

  useEffect(() => {
    // Chưa load xong thì không ghi, tránh đè dữ liệu cũ bằng giá trị mặc định
    if (loaded.current) browser.storage.local.set({ [key]: value });
  }, [key, value]);

  return [value, setValue] as const;
}
