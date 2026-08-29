import type { Config } from "tailwindcss";

const config: Config = {
  // 彻底移除 dark mode（TraeWork 规范要求 light-only）
  darkMode: undefined,
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      // ===== 颜色：TraeWork token 别名 =====
      // 主样式仍用 .ds-* 类；此处仅为 Tailwind 工具类便利
      colors: {
        // shadcn 兼容（指向 TraeWork token）
        border: "var(--border-neutral-l2)",
        input: "var(--border-neutral-l2)",
        ring: "var(--border-brand)",
        background: "var(--bg-base-default)",
        foreground: "var(--text-default)",
        primary: {
          DEFAULT: "var(--bg-brand)",
          foreground: "var(--text-onbrand)",
        },
        secondary: {
          DEFAULT: "var(--bg-overlay-l1)",
          foreground: "var(--text-default)",
        },
        destructive: {
          DEFAULT: "var(--status-error-default)",
          foreground: "var(--text-onbrand)",
        },
        muted: {
          DEFAULT: "var(--bg-overlay-l1)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "var(--bg-overlay-l1)",
          foreground: "var(--text-default)",
        },
        popover: {
          DEFAULT: "var(--bg-base-default)",
          foreground: "var(--text-default)",
        },
        card: {
          DEFAULT: "var(--bg-base-default)",
          foreground: "var(--text-default)",
        },
        // TraeWork 语义别名（直接对应 CSS 变量）
        "text-default": "var(--text-default)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-disabled": "var(--text-disabled)",
        "text-onbrand": "var(--text-onbrand)",
        "text-brand": "var(--text-brand)",

        "icon-default": "var(--icon-default)",
        "icon-secondary": "var(--icon-secondary)",
        "icon-tertiary": "var(--icon-tertiary)",
        "icon-onbrand": "var(--icon-onbrand)",
        "icon-brand": "var(--icon-brand)",

        "border-neutral-l1": "var(--border-neutral-l1)",
        "border-neutral-l2": "var(--border-neutral-l2)",
        "border-neutral-l3": "var(--border-neutral-l3)",
        "border-contrast": "var(--border-contrast)",
        "border-brand": "var(--border-brand)",

        "bg-base-default": "var(--bg-base-default)",
        "bg-base-secondary": "var(--bg-base-secondary)",
        "bg-base-tertiary": "var(--bg-base-tertiary)",
        "bg-overlay-l1": "var(--bg-overlay-l1)",
        "bg-overlay-l2": "var(--bg-overlay-l2)",
        "bg-overlay-l3": "var(--bg-overlay-l3)",
        "bg-overlay-l4": "var(--bg-overlay-l4)",
        "bg-brand": "var(--bg-brand)",
        "bg-brand-hover": "var(--bg-brand-hover)",
        "bg-brand-active": "var(--bg-brand-active)",
        "bg-invert": "var(--bg-invert)",
        "bg-invert-hover": "var(--bg-invert-hover)",

        "status-success": "var(--status-success-default)",
        "status-warning": "var(--status-warning-default)",
        "status-error": "var(--status-error-default)",
        "status-info": "var(--status-primary-default)",
      },
      // ===== 圆角：TraeWork 语义别名 =====
      borderRadius: {
        "ds-xs": "var(--radius-2)",
        "ds-sm": "var(--radius-4)",
        "ds-md": "var(--radius-6)",
        "ds-lg": "var(--radius-8)",
        "ds-xl": "var(--radius-10)",
        "ds-2xl": "var(--radius-12)",
        "ds-3xl": "var(--radius-16)",
        "ds-4xl": "var(--radius-20)",
        "ds-5xl": "var(--radius-24)",
        "ds-full": "var(--radius-full)",
        // shadcn 别名（全局圆角上调：主容器 16px）
        lg: "var(--radius-16)",
        md: "var(--radius-8)",
        sm: "var(--radius-6)",
      },
      // ===== 投影：柔和卡片投影 =====
      boxShadow: {
        card: "var(--shadow-card)",
        // 业务代码使用 shadow-sm/md/lg，统一覆盖为柔和规范投影
        sm: "0 2px 8px rgba(0, 0, 0, 0.06)",
        md: "0 4px 12px rgba(0, 0, 0, 0.08)",
        lg: "0 6px 16px rgba(0, 0, 0, 0.10)",
      },
      // ===== 间距：TraeWork spacer 别名 =====
      spacing: {
        "ds-2": "var(--spacer-2)",
        "ds-4": "var(--spacer-4)",
        "ds-6": "var(--spacer-6)",
        "ds-8": "var(--spacer-8)",
        "ds-10": "var(--spacer-10)",
        "ds-12": "var(--spacer-12)",
        "ds-16": "var(--spacer-16)",
        "ds-20": "var(--spacer-20)",
        "ds-24": "var(--spacer-24)",
        "ds-32": "var(--spacer-32)",
        "ds-40": "var(--spacer-40)",
        "ds-48": "var(--spacer-48)",
        "ds-64": "var(--spacer-64)",
      },
      // ===== 字体：TraeWork 字体族 =====
      fontFamily: {
        "ds-default": "var(--font-family-default)",
        "ds-heading": "var(--font-family-heading)",
        "ds-metric": "var(--font-family-metric)",
        "ds-mono": "var(--font-family-mono)",
      },
      // ===== 字号：TraeWork 完整 type scale =====
      fontSize: {
        "ds-xs": ["var(--body-xs-font-size)", { lineHeight: "var(--body-xs-line-height)" }],
        "ds-sm": ["var(--body-sm-font-size)", { lineHeight: "var(--body-sm-line-height)" }],
        "ds-md": ["var(--body-md-font-size)", { lineHeight: "var(--body-md-line-height)" }],
        "ds-base": ["var(--body-base-font-size)", { lineHeight: "var(--body-base-line-height)" }],
        "ds-lg": ["var(--body-lg-font-size)", { lineHeight: "var(--body-lg-line-height)" }],
        "ds-heading-3xs": ["var(--heading-3xs-font-size)", { lineHeight: "var(--heading-3xs-line-height)", fontWeight: "var(--heading-3xs-font-weight)" }],
        "ds-heading-2xs": ["var(--heading-2xs-font-size)", { lineHeight: "var(--heading-2xs-line-height)", fontWeight: "var(--heading-2xs-font-weight)" }],
        "ds-heading-xs": ["var(--heading-xs-font-size)", { lineHeight: "var(--heading-xs-line-height)", fontWeight: "var(--heading-xs-font-weight)" }],
        "ds-heading-sm": ["var(--heading-sm-font-size)", { lineHeight: "var(--heading-sm-line-height)", fontWeight: "var(--heading-sm-font-weight)" }],
        "ds-heading-md": ["var(--heading-md-font-size)", { lineHeight: "var(--heading-md-line-height)", fontWeight: "var(--heading-md-font-weight)" }],
        "ds-heading-lg": ["var(--heading-lg-font-size)", { lineHeight: "var(--heading-lg-line-height)", fontWeight: "var(--heading-lg-font-weight)" }],
        "ds-heading-xl": ["var(--heading-xl-font-size)", { lineHeight: "var(--heading-xl-line-height)", fontWeight: "var(--heading-xl-font-weight)" }],
        "ds-heading-2xl": ["var(--heading-2xl-font-size)", { lineHeight: "var(--heading-2xl-line-height)", fontWeight: "var(--heading-2xl-font-weight)" }],
        "ds-heading-3xl": ["var(--heading-3xl-font-size)", { lineHeight: "var(--heading-3xl-line-height)", fontWeight: "var(--heading-3xl-font-weight)" }],
        "ds-heading-display": ["var(--heading-display-font-size)", { lineHeight: "var(--heading-display-line-height)", fontWeight: "var(--heading-display-font-weight)" }],
      },
      // ===== 过渡：TraeWork motion 规范 =====
      transitionDuration: {
        "ds-hover": "120ms",
        "ds-state": "200ms",
        "ds-layout": "300ms",
      },
      // ===== 保留 keyframes =====
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
