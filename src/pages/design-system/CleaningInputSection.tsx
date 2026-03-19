import LabelSection from "./LabelSection";
import TextareaSection from "./TextareaSection";
import TextInputSection from "./TextInputSection";
import PlatformInputsSection from "./PlatformInputsSection";

export default function CleaningInputSection() {
  return (
    <div className="space-y-12">
      <LabelSection />
      <TextInputSection />
      <TextareaSection />
      <PlatformInputsSection />
    </div>
  );
}
