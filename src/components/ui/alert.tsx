import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "bg-[#FEEBEE] text-[#B71C1C] border-[#EF9A9A] [&>svg]:text-[#D32F2F]",
        error: "bg-[#FEEBEE] text-[#B71C1C] border-[#EF9A9A] [&>svg]:text-[#D32F2F]",
        warning: "bg-[#FFF8E1] text-[#78510F] border-[#FFE082] [&>svg]:text-[#F59E0B]",
        info: "bg-[#EDF2FF] text-[#2A247C] border-[#C9D3FF] [&>svg]:text-[#5342F2]",
        success: "bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7] [&>svg]:text-[#43A047]",
        empty: "bg-[#F4F6F9] text-[#4C5069] border-[#E5E7EF]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
