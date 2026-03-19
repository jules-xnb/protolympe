import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AvatarSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Avatar
      </h2>

      <div className="flex items-center gap-6">
        <div className="space-y-2 text-center">
          <Avatar className="h-12 w-12">
            <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=JD" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">Avec image</p>
        </div>

        <div className="space-y-2 text-center">
          <Avatar className="h-12 w-12">
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">Fallback</p>
        </div>

        <div className="space-y-2 text-center">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">SM</AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">Small</p>
        </div>

        <div className="space-y-2 text-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">LG</AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">Large</p>
        </div>
      </div>
    </section>
  );
}
