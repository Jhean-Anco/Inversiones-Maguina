import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--erp-radius-md)] border border-transparent text-sm font-semibold tracking-[-0.006em] transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--erp-focus)_30%,transparent)] disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        default: "border-[var(--erp-brand-deep)] bg-primary text-primary-foreground shadow-[var(--erp-shadow-xs)] hover:bg-[var(--erp-brand-deep)]",
        destructive: "border-[#b51d2f] bg-destructive text-destructive-foreground shadow-[var(--erp-shadow-xs)] hover:bg-[var(--erp-accent-hover)]",
        outline: "border-[var(--erp-border-strong)] bg-[var(--erp-surface)] text-foreground shadow-[var(--erp-shadow-xs)] hover:bg-[var(--erp-surface-hover)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "text-[var(--erp-ink-muted)] hover:bg-[var(--erp-surface-sunken)] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  const classes = [buttonVariants({ variant, size }), className].filter(Boolean).join(" ");
  return <button className={classes} type={type} {...props} />;
}
