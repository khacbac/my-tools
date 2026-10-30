import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Build thẳng ra dist/ (giống social-assistant) thay vì .output/chrome-mv3
  outDir: 'dist',
  outDirTemplate: '',
  manifest: {
    name: 'My Tools',
    description: 'Bộ tiện ích nhỏ cá nhân',
    permissions: ['storage', 'sidePanel'],
    action: { default_title: 'Mở My Tools' },
  },
});
