import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function ProgressSection() {
  const [value, setValue] = useState(50);

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Progress
      </h2>

      {/* Interactive progress */}
      <div className="space-y-4 w-[400px]">
        <div className="space-y-2">
          <Label>Valeur: {value}%</Label>
          <Progress value={value} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ajuster la progression</Label>
          <Slider
            value={[value]}
            onValueChange={([v]) => setValue(v)}
            max={100}
            step={1}
          />
        </div>
      </div>

      {/* Fixed examples */}
      <div className="space-y-4 w-[400px]">
        <h3 className="text-[14px] font-semibold text-foreground">Exemples fixes</h3>
        <div className="space-y-2">
          <Label>0%</Label>
          <Progress value={0} />
        </div>
        <div className="space-y-2">
          <Label>25%</Label>
          <Progress value={25} />
        </div>
        <div className="space-y-2">
          <Label>50%</Label>
          <Progress value={50} />
        </div>
        <div className="space-y-2">
          <Label>75%</Label>
          <Progress value={75} />
        </div>
        <div className="space-y-2">
          <Label>100%</Label>
          <Progress value={100} />
        </div>
      </div>
    </section>
  );
}
