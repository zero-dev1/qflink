// src/components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none",
          variant === "primary" &&
            "h-10 px-6 rounded-lg bg-cyan-primary text-text-on-cyan text-label hover:bg-cyan-hover active:bg-cyan-pressed",
          variant === "secondary" &&
            "h-10 px-6 rounded-lg bg-transparent border border-white/[0.10] text-text-primary text-label hover:bg-white/[0.02] active:bg-white/[0.04]",
          variant === "danger" &&
            "h-10 px-6 rounded-lg bg-transparent border border-white/[0.10] text-error text-label hover:bg-error/10 active:bg-error/20",
          variant === "icon" &&
            "h-8 w-8 rounded-lg bg-transparent text-text-secondary hover:bg-white/[0.04] hover:text-text-primary active:bg-white/[0.06]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
