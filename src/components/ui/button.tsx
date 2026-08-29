import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * TraeWork 按钮组件。
 *
 * 内部使用 `.ds-btn` + `.ds-btn--*` 变体类，cva 仅做 API 透传。
 * 保留 shadcn API（variant/size/asChild）以便业务代码 0 修改。
 *
 * 颜色说明：--bg-brand 为暖橙强调色（#FF7A00），
 * 主按钮显示为橙底白字，符合"友好专业 AI 创作工具"的主题定位。
 */
const buttonVariants = cva(
  "ds-btn",
  {
    variants: {
      variant: {
        default: "ds-btn--primary",
        primary: "ds-btn--primary",
        secondary: "ds-btn--secondary",
        outline: "ds-btn--secondary",
        ghost: "ds-btn--tertiary",
        tertiary: "ds-btn--tertiary",
        destructive: "ds-btn--danger",
        danger: "ds-btn--danger",
        "danger-strong": "ds-btn--danger-strong",
        "danger-subtle": "ds-btn--danger-subtle",
        link: "ds-btn--link",
        brand: "ds-btn--brand",
        warning: "ds-btn--warning",
      },
      size: {
        sm: "ds-btn--sm",
        md: "ds-btn--md",
        lg: "ds-btn--lg",
        default: "ds-btn--md",
        icon: "ds-btn--icon",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
