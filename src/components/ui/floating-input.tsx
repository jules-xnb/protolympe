import * as React from "react";
import { cn } from "@/lib/utils";

interface FloatingInputProps extends Omit<React.ComponentProps<"input">, "placeholder"> {
  /** Label qui flotte au-dessus du champ quand il est focus ou rempli */
  label: string;
  /** Valeur contrôlée */
  value: string;
  /** Callback de changement */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Afficher le style erreur */
  error?: boolean;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, value, onChange, error, disabled, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const hasValue = value.length > 0;
    const isFloating = focused || hasValue;

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
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
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
