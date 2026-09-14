/**
 * 预加载脚本：极简，仅暴露桌面版运行环境标记。
 * 页面内通过 window.mobiDesktop?.isDesktop 判断（NEXT_PUBLIC_DESKTOP_MODE 构建期已注入，此为运行期兜底）。
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("mobiDesktop", {
  isDesktop: true,
  platform: process.platform,
});
