"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";

/**
 * 联系我们二维码卡片。
 * 图片放在 public/assets/ 下，文件名固定：
 *   qr-wechat-group.png（微信群） / qr-feishu.png（飞书群）
 * 图片未上传时自动显示占位框，不会出现破图。
 */
function QrCard({ src, title, hint }: { src: string; title: string; hint: string }) {
  const [ready, setReady] = useState(false); // 图片存在且加载成功
  const [checked, setChecked] = useState(false); // 是否已探测

  useEffect(() => {
    let alive = true;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        if (alive && r.ok) setReady(true);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [src]);

  const showImage = ready;
  const settled = checked;

  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      {!settled ? (
        <div className="h-[150px] w-[150px] animate-pulse rounded-xl bg-bg-overlay-l1" />
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          width={150}
          height={150}
          className="h-[150px] w-[150px] rounded-xl object-contain"
        />
      ) : (
        <div className="flex h-[150px] w-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-neutral-l2 bg-bg-overlay-l1 text-text-tertiary">
          <QrCode className="h-6 w-6" />
          <span className="text-xs">二维码待补充</span>
        </div>
      )}
      <div className="text-sm font-medium text-text-default">{title}</div>
      <div className="text-xs text-text-tertiary">{hint}</div>
    </div>
  );
}

export function ContactQr() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <QrCard
        src="/assets/qr-wechat-group.png"
        title="微信创作者群"
        hint="扫码加入，和作者们一起聊"
      />
      <QrCard
        src="/assets/qr-feishu.png"
        title="飞书交流群"
        hint="扫码加入，产品更新第一时间知道"
      />
    </div>
  );
}
