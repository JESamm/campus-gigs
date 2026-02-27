import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700",
      outline: "border border-slate-600 text-white hover:bg-slate-800",
      ghost: "text-slate-300 hover:bg-slate-800",
    };

    const sizes = {
      sm: "px-3 py-1 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ""}`;

    return (
      <button ref={ref} className={classes} {...props} />
    );
  }
);

Button.displayName = "Button";
