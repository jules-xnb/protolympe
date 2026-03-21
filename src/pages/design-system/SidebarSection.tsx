import { Home, Settings, Users, FileText, ChevronDown } from "lucide-react";

export default function SidebarSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Sidebar
      </h2>

      <p className="text-xs text-muted-foreground">
        La sidebar est utilisée dans les layouts Admin et Intégrateur. Elle nécessite un SidebarProvider et le hook useIsMobile.
        Voici un aperçu statique des éléments qui la composent.
      </p>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Aperçu statique</h3>
      <div className="border border-border rounded-lg overflow-hidden h-[400px] w-[16rem] bg-sidebar">
        {/* Header */}
        <div className="flex flex-col gap-2 p-3 border-b border-border">
          <span className="text-sm font-semibold">Delta RM</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto py-2">
          {/* Group */}
          <div className="px-2 mb-1">
            <div className="flex h-8 items-center px-2 text-xs font-medium text-muted-foreground">
              NAVIGATION
            </div>
          </div>

          {/* Menu items */}
          <ul className="flex flex-col gap-1 px-2">
            <li>
              <div className="flex w-full items-center gap-2 rounded-md p-2 text-sm bg-[#F4F6F9] font-medium">
                <Home className="h-5 w-5" />
                <span>Accueil</span>
              </div>
            </li>
            <li>
              <div className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-[#F4F6F9] cursor-pointer">
                <Users className="h-5 w-5" />
                <span>Clients</span>
                <span className="ml-auto text-xs text-muted-foreground">12</span>
              </div>
            </li>
            <li>
              <div className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-[#F4F6F9] cursor-pointer">
                <FileText className="h-5 w-5" />
                <span>Documents</span>
                <ChevronDown className="ml-auto h-4 w-4 rotate-180" />
              </div>
              {/* Sub-menu */}
              <ul className="mx-3.5 translate-x-px flex flex-col gap-1 border-l border-border px-2.5 py-0.5">
                <li>
                  <span className="flex h-7 items-center gap-2 rounded-md px-2 text-sm bg-[#F4F6F9] cursor-pointer">
                    Contrats
                  </span>
                </li>
                <li>
                  <span className="flex h-7 items-center gap-2 rounded-md px-2 text-sm hover:bg-[#F4F6F9] cursor-pointer">
                    Factures
                  </span>
                </li>
              </ul>
            </li>
          </ul>

          {/* Second group */}
          <div className="px-2 mt-4 mb-1">
            <div className="flex h-8 items-center px-2 text-xs font-medium text-muted-foreground">
              CONFIGURATION
            </div>
          </div>
          <ul className="flex flex-col gap-1 px-2">
            <li>
              <div className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-[#F4F6F9] cursor-pointer">
                <Settings className="h-5 w-5" />
                <span>Paramètres</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <span className="text-xs text-muted-foreground">v1.0.0</span>
        </div>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Composants disponibles</h3>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr] bg-muted">
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Composant</div>
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Description</div>
        </div>
        {[
          ["SidebarProvider", "Context provider pour l'état ouvert/fermé"],
          ["Sidebar", "Conteneur principal (left/right, sidebar/floating/inset)"],
          ["SidebarHeader / Footer", "En-tête et pied de la sidebar"],
          ["SidebarContent", "Zone scrollable principale"],
          ["SidebarGroup", "Groupe de liens avec label et contenu"],
          ["SidebarMenu / MenuItem", "Liste de navigation"],
          ["SidebarMenuButton", "Bouton de menu (variants: default, outline)"],
          ["SidebarMenuBadge", "Badge de notification"],
          ["SidebarMenuSub", "Sous-menu imbriqué"],
          ["SidebarTrigger", "Bouton toggle de la sidebar"],
          ["SidebarRail", "Rail de redimensionnement"],
        ].map(([name, desc]) => (
          <div key={name} className="grid grid-cols-[1fr_2fr] items-center border-t border-border bg-card">
            <div className="px-4 py-2 text-sm font-mono text-xs">{name}</div>
            <div className="px-4 py-2 text-sm text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
