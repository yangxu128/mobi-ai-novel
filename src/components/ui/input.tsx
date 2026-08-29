import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TraeWork 输入框组件。
 * 使用 .ds-input 类（TraeWork 规范）。
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn("ds-input", className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
