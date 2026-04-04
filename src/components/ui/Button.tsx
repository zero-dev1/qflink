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
            "h-10 px-6 rounded-md bg-cyan-primary text-text-on-cyan text-label hover:bg-cyan-hover active:bg-cyan-pressed",
          variant === "secondary" &&
            "h-10 px-6 rounded-md bg-transparent border border-border-medium text-text-primary text-label hover:bg-surface-2 active:bg-surface-3",
          variant === "danger" &&
            "h-10 px-6 rounded-md bg-transparent border border-border-medium text-error text-label hover:bg-error/10 active:bg-error/20",
          variant === "icon" &&
            "h-8 w-8 rounded-sm bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary active:bg-surface-3",
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
