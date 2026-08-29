/**
 * admin 路由切换时的过渡骨架
 * 注：侧边栏由 admin/layout.tsx 提供，路由切换时不会卸载
 * 这里只占位内容区，避免整页闪烁
 */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-40 bg-bg-overlay-l1 rounded animate-pulse" />
      <div className="h-4 w-24 bg-bg-overlay-l1 rounded animate-pulse" />
      <div className="h-64 rounded-2xl bg-bg-overlay-l1 animate-pulse" />
    </div>
  );
}
