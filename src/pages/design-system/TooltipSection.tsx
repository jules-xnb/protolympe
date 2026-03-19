import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TooltipSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Tooltip
      </h2>
      <div className="flex items-start gap-12 flex-wrap">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Default</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Hover me
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tooltip text</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Top</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Hover me
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Tooltip on top</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Right</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Hover me
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Tooltip on right</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Left</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Hover me
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Tooltip on left</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </section>
  );
}
