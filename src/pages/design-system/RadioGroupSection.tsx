import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function RadioGroupSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Radio Group
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Par défaut</h3>
      <div className="flex gap-4 items-start">
        <RadioGroup defaultValue="option1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option1" id="r1" />
            <Label htmlFor="r1">Option 1</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option2" id="r2" />
            <Label htmlFor="r2">Option 2</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option3" id="r3" />
            <Label htmlFor="r3">Option 3</Label>
          </div>
        </RadioGroup>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Horizontal</h3>
      <div className="flex gap-4 items-start">
        <RadioGroup defaultValue="a" className="flex flex-row gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="a" id="rh1" />
            <Label htmlFor="rh1">Oui</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="b" id="rh2" />
            <Label htmlFor="rh2">Non</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="c" id="rh3" />
            <Label htmlFor="rh3">Ne sais pas</Label>
          </div>
        </RadioGroup>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec option désactivée</h3>
      <div className="flex gap-4 items-start">
        <RadioGroup defaultValue="active">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="active" id="rd1" />
            <Label htmlFor="rd1">Actif</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="disabled" id="rd2" disabled />
            <Label htmlFor="rd2" className="opacity-50">Désactivé</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="other" id="rd3" />
            <Label htmlFor="rd3">Autre</Label>
          </div>
        </RadioGroup>
      </div>
    </section>
  );
}
