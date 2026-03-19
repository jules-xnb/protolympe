import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloatingInputProps extends Omit<React.ComponentProps<"input">, "placeholder"> {
  label: string;
  error?: boolean;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, value, defaultValue, onChange, onFocus, onBlur, disabled, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [hasInternalValue, setHasInternalValue] = React.useState(
      defaultValue !== undefined && defaultValue !== null && String(defaultValue).length > 0,
    );

    const isControlled = value !== undefined;
    const hasValue = isControlled
      ? value !== null && String(value).length > 0
      : hasInternalValue;

    const isFloating = focused || hasValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setHasInternalValue(e.target.value.length > 0);
      onChange?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };

    return (
      <div className={cn("relative w-full pt-2", disabled && "opacity-30 pointer-events-none")}>
        <div
          className={cn(
            "h-10 w-full rounded-lg px-3 flex items-center transition-colors",
            focused
              ? `border-2 ${error ? "border-destructive" : "border-primary"}`
              : error
                ? "border border-destructive"
                : "border border-input hover:border-foreground",
          )}
        >
          <input
            ref={ref}
            value={value}
            defaultValue={isControlled ? undefined : defaultValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={!isFloating ? label : undefined}
            className={cn(
              "w-full text-sm text-foreground placeholder:text-muted-foreground bg-transparent outline-none border-none focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed",
              className,
            )}
            {...props}
          />
        </div>
        {isFloating && (
          <span
            className={cn(
              "absolute top-2 left-2 -translate-y-1/2 text-xs font-medium px-1 bg-background select-none pointer-events-none leading-none",
              focused
                ? error ? "text-destructive" : "text-primary"
                : error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        )}
      </div>
    );
  },
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
