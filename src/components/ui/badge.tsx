import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("ds-tag", {
  variants: {
    variant: {
      default: "ds-tag--neutral",
      secondary: "ds-tag--neutral",
      outline: "ds-tag",
      success: "ds-tag--success",
      warning: "ds-tag--warning",
      error: "ds-tag--danger",
      danger: "ds-tag--danger",
      brand: "ds-tag--brand",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
