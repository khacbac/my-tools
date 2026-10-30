export default defineBackground(() => {
  // Bấm icon extension -> mở side panel (không dùng popup vì popup tự đóng khi click ra ngoài)
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
