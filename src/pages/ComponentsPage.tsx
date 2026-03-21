const typographyItems = [
  { name: "Display 1", size: "56px", className: "text-[56px] font-bold" },
  { name: "Display 2", size: "48px", className: "text-[48px] font-bold" },
  { name: "H1", size: "40px", className: "text-[40px] font-bold" },
  { name: "H2", size: "36px", className: "text-[36px] font-bold" },
  { name: "H3", size: "32px", className: "text-[32px] font-semibold" },
  { name: "H4", size: "20px", className: "text-[20px] font-semibold" },
  { name: "H5", size: "18px", className: "text-[18px] font-semibold" },
  { name: "H6", size: "16px", className: "text-[16px] font-semibold" },
  { name: "Subtitle 1", size: "16px", className: "text-[16px] font-medium" },
  { name: "Subtitle 2", size: "14px", className: "text-[14px] font-medium" },
  { name: "Body 1", size: "16px", className: "text-[16px] font-normal" },
  { name: "Body 2", size: "14px", className: "text-[14px] font-normal" },
  { name: "Caption", size: "12px", className: "text-[12px] font-normal" },
  { name: "OVERLINE", size: "12px", className: "text-[12px] font-medium uppercase tracking-widest" },
];

type ColorShade = { shade: string; hex: string };
type ColorPalette = { name: string; label: string; shades: ColorShade[] };

const colorPalettes: ColorPalette[] = [
  {
    name: "blue",
    label: "Blue (Main Delta)",
    shades: [
      { shade: "50", hex: "#F8FAFF" },
      { shade: "100", hex: "#EDF2FF" },
      { shade: "200", hex: "#C9D3FF" },
      { shade: "300", hex: "#A4B6FF" },
      { shade: "400", hex: "#7C87FF" },
      { shade: "500", hex: "#6160FE" },
      { shade: "600", hex: "#5342F2" },
      { shade: "700", hex: "#4E3BD7" },
      { shade: "800", hex: "#3A2EAD" },
      { shade: "900", hex: "#2A247C" },
      { shade: "950", hex: "#1F1A4F" },
    ],
  },
  {
    name: "grey",
    label: "Grey (Neutral Delta)",
    shades: [
      { shade: "50", hex: "#F4F6F9" },
      { shade: "100", hex: "#E5E7EF" },
      { shade: "200", hex: "#CBCFDE" },
      { shade: "300", hex: "#B6BBD1" },
      { shade: "400", hex: "#979FBE" },
      { shade: "500", hex: "#858EB3" },
      { shade: "600", hex: "#747C9F" },
      { shade: "700", hex: "#616785" },
      { shade: "800", hex: "#4C5069" },
      { shade: "900", hex: "#37394D" },
      { shade: "950", hex: "#232332" },
    ],
  },
  {
    name: "orange",
    label: "Orange (Secondary Delta)",
    shades: [
      { shade: "50", hex: "#FFF8EB" },
      { shade: "100", hex: "#FEEAC7" },
      { shade: "200", hex: "#FDD28A" },
      { shade: "300", hex: "#FCBB4D" },
      { shade: "400", hex: "#FBAB24" },
      { shade: "500", hex: "#F59E0B" },
      { shade: "600", hex: "#D98B06" },
      { shade: "700", hex: "#B47409" },
      { shade: "800", hex: "#92610E" },
      { shade: "900", hex: "#78510F" },
      { shade: "950", hex: "#452C03" },
    ],
  },
  {
    name: "red",
    label: "Red",
    shades: [
      { shade: "50", hex: "#FEEBEE" },
      { shade: "100", hex: "#FECDD2" },
      { shade: "200", hex: "#EF9A9A" },
      { shade: "300", hex: "#E57373" },
      { shade: "400", hex: "#EF5350" },
      { shade: "500", hex: "#F44336" },
      { shade: "600", hex: "#E53935" },
      { shade: "700", hex: "#D32F2F" },
      { shade: "800", hex: "#C62828" },
      { shade: "900", hex: "#B71C1C" },
    ],
  },
  {
    name: "pink",
    label: "Pink",
    shades: [
      { shade: "50", hex: "#FCE4EC" },
      { shade: "100", hex: "#F8BBD0" },
      { shade: "200", hex: "#F48FB1" },
      { shade: "300", hex: "#F06292" },
      { shade: "400", hex: "#EC407A" },
      { shade: "500", hex: "#E91E63" },
      { shade: "600", hex: "#D81B60" },
      { shade: "700", hex: "#C2185B" },
      { shade: "800", hex: "#AD1457" },
      { shade: "900", hex: "#880E4F" },
    ],
  },
  {
    name: "purple",
    label: "Purple",
    shades: [
      { shade: "50", hex: "#F3E5F5" },
      { shade: "100", hex: "#E1BEE7" },
      { shade: "200", hex: "#CE93D8" },
      { shade: "300", hex: "#BA68C8" },
      { shade: "400", hex: "#AB47BC" },
      { shade: "500", hex: "#9C27B0" },
      { shade: "600", hex: "#8E24AA" },
      { shade: "700", hex: "#7B1FA2" },
      { shade: "800", hex: "#6A1B9A" },
      { shade: "900", hex: "#4A148C" },
    ],
  },
  {
    name: "deepPurple",
    label: "Deep Purple",
    shades: [
      { shade: "50", hex: "#EDE7F6" },
      { shade: "100", hex: "#D1C4E9" },
      { shade: "200", hex: "#B39DDB" },
      { shade: "300", hex: "#9575CD" },
      { shade: "400", hex: "#7E57C2" },
      { shade: "500", hex: "#673AB7" },
      { shade: "600", hex: "#5E35B1" },
      { shade: "700", hex: "#512DA8" },
      { shade: "800", hex: "#4527A0" },
      { shade: "900", hex: "#311B92" },
    ],
  },
  {
    name: "indigo",
    label: "Indigo",
    shades: [
      { shade: "50", hex: "#E8EAF6" },
      { shade: "100", hex: "#C5CAE9" },
      { shade: "200", hex: "#9FA8DA" },
      { shade: "300", hex: "#7986CB" },
      { shade: "400", hex: "#5C6BC0" },
      { shade: "500", hex: "#3F51B5" },
      { shade: "600", hex: "#3949AB" },
      { shade: "700", hex: "#303F9F" },
      { shade: "800", hex: "#283593" },
      { shade: "900", hex: "#1A237E" },
    ],
  },
  {
    name: "lightBlue",
    label: "Light Blue",
    shades: [
      { shade: "50", hex: "#E1F5FE" },
      { shade: "100", hex: "#B3E5FC" },
      { shade: "200", hex: "#81D4FA" },
      { shade: "300", hex: "#4FC3F7" },
      { shade: "400", hex: "#29B6F6" },
      { shade: "500", hex: "#03A9F4" },
      { shade: "600", hex: "#039BE5" },
      { shade: "700", hex: "#0288D1" },
      { shade: "800", hex: "#0277BD" },
      { shade: "900", hex: "#01579B" },
    ],
  },
  {
    name: "cyan",
    label: "Cyan",
    shades: [
      { shade: "50", hex: "#E0F7FA" },
      { shade: "100", hex: "#B2EBF2" },
      { shade: "200", hex: "#80DEEA" },
      { shade: "300", hex: "#4DD0E1" },
      { shade: "400", hex: "#26C6DA" },
      { shade: "500", hex: "#00BCD4" },
      { shade: "600", hex: "#00ACC1" },
      { shade: "700", hex: "#0097A7" },
      { shade: "800", hex: "#00838F" },
      { shade: "900", hex: "#006064" },
    ],
  },
  {
    name: "teal",
    label: "Teal",
    shades: [
      { shade: "50", hex: "#E0F2F1" },
      { shade: "100", hex: "#B2DFDB" },
      { shade: "200", hex: "#80CBC4" },
      { shade: "300", hex: "#4DB6AC" },
      { shade: "400", hex: "#26A69A" },
      { shade: "500", hex: "#009688" },
      { shade: "600", hex: "#00897B" },
      { shade: "700", hex: "#00796B" },
      { shade: "800", hex: "#00695C" },
      { shade: "900", hex: "#004D40" },
    ],
  },
  {
    name: "green",
    label: "Green",
    shades: [
      { shade: "50", hex: "#E8F5E9" },
      { shade: "100", hex: "#C8E6C9" },
      { shade: "200", hex: "#A5D6A7" },
      { shade: "300", hex: "#81C784" },
      { shade: "400", hex: "#66BB6A" },
      { shade: "500", hex: "#4CAF50" },
      { shade: "600", hex: "#43A047" },
      { shade: "700", hex: "#388E3C" },
      { shade: "800", hex: "#2E7D32" },
      { shade: "900", hex: "#1B5E20" },
    ],
  },
  {
    name: "lightGreen",
    label: "Light Green",
    shades: [
      { shade: "50", hex: "#F1F8E9" },
      { shade: "100", hex: "#DCEDC8" },
      { shade: "200", hex: "#C5E1A5" },
      { shade: "300", hex: "#AED581" },
      { shade: "400", hex: "#8BC34A" },
      { shade: "500", hex: "#8BC34A" },
      { shade: "600", hex: "#7CB342" },
      { shade: "700", hex: "#689F38" },
      { shade: "800", hex: "#558B2F" },
      { shade: "900", hex: "#33691E" },
    ],
  },
  {
    name: "lime",
    label: "Lime",
    shades: [
      { shade: "50", hex: "#F9FBE7" },
      { shade: "100", hex: "#F0F4C3" },
      { shade: "200", hex: "#E6EE9C" },
      { shade: "300", hex: "#DCE775" },
      { shade: "400", hex: "#D4E157" },
      { shade: "500", hex: "#CDDC39" },
      { shade: "600", hex: "#C0CA33" },
      { shade: "700", hex: "#AFB42B" },
      { shade: "800", hex: "#9E9D24" },
      { shade: "900", hex: "#827717" },
    ],
  },
  {
    name: "yellow",
    label: "Yellow",
    shades: [
      { shade: "50", hex: "#FFFDE7" },
      { shade: "100", hex: "#FFF9C4" },
      { shade: "200", hex: "#FFF59D" },
      { shade: "300", hex: "#FFF176" },
      { shade: "400", hex: "#FFEE58" },
      { shade: "500", hex: "#FFEB3B" },
      { shade: "600", hex: "#FDD835" },
      { shade: "700", hex: "#FBC02D" },
      { shade: "800", hex: "#F9A825" },
      { shade: "900", hex: "#F57F17" },
    ],
  },
  {
    name: "amber",
    label: "Amber",
    shades: [
      { shade: "50", hex: "#FFF8E1" },
      { shade: "100", hex: "#FFECB3" },
      { shade: "200", hex: "#FFE082" },
      { shade: "300", hex: "#FFD54F" },
      { shade: "400", hex: "#FFCA28" },
      { shade: "500", hex: "#FFC107" },
      { shade: "600", hex: "#FFB300" },
      { shade: "700", hex: "#FFA000" },
      { shade: "800", hex: "#FF8F00" },
      { shade: "900", hex: "#FF6F00" },
    ],
  },
  {
    name: "deepOrange",
    label: "Deep Orange",
    shades: [
      { shade: "50", hex: "#FBE9E7" },
      { shade: "100", hex: "#FFCCBC" },
      { shade: "200", hex: "#FFAB91" },
      { shade: "300", hex: "#FF8A65" },
      { shade: "400", hex: "#FF7043" },
      { shade: "500", hex: "#FF5722" },
      { shade: "600", hex: "#F4511E" },
      { shade: "700", hex: "#E64A19" },
      { shade: "800", hex: "#D84315" },
      { shade: "900", hex: "#BF360C" },
    ],
  },
  {
    name: "blueGrey",
    label: "Blue Grey",
    shades: [
      { shade: "50", hex: "#ECEFF1" },
      { shade: "100", hex: "#CFD8DC" },
      { shade: "200", hex: "#B0BEC5" },
      { shade: "300", hex: "#90A4AE" },
      { shade: "400", hex: "#78909C" },
      { shade: "500", hex: "#607D8B" },
      { shade: "600", hex: "#546E7A" },
      { shade: "700", hex: "#455A64" },
      { shade: "800", hex: "#37474F" },
      { shade: "900", hex: "#263238" },
    ],
  },
  {
    name: "common",
    label: "Common",
    shades: [
      { shade: "Black", hex: "#000000" },
      { shade: "White", hex: "#FFFFFF" },
    ],
  },
  {
    name: "text",
    label: "Texte",
    shades: [
      { shade: "Primary", hex: "#232332" },
      { shade: "Secondary", hex: "#4C5069" },
      { shade: "Disabled", hex: "#858EB3" },
      { shade: "Inverted", hex: "#FFFFFF" },
    ],
  },
  {
    name: "backdrop",
    label: "Backdrop (Pop-up / Drawer)",
    shades: [
      { shade: "default", hex: "#1F1A4F80" },
    ],
  },
];

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

import ButtonsSection from "./design-system/ButtonsSection";
import SwitchSection from "./design-system/SwitchSection";
import TextInputSection from "./design-system/TextInputSection";
import AlertSection from "./design-system/AlertSection";
import TooltipSection from "./design-system/TooltipSection";
import TabSection from "./design-system/TabSection";
import TableSection from "./design-system/TableSection";
import CardSection from "./design-system/CardSection";
import MenuSection from "./design-system/MenuSection";
import CalendarSection from "./design-system/CalendarSection";
import AvatarSection from "./design-system/AvatarSection";
import CheckboxSection from "./design-system/CheckboxSection";
import TextareaSection from "./design-system/TextareaSection";
import SeparatorSection from "./design-system/SeparatorSection";
import LabelSection from "./design-system/LabelSection";
import FormSection from "./design-system/FormSection";
import DialogSection from "./design-system/DialogSection";
import PanelSection from "./design-system/PanelSection";
import SkeletonSection from "./design-system/SkeletonSection";
import PopoverSection from "./design-system/PopoverSection";
import CommandSection from "./design-system/CommandSection";
import ScrollAreaSection from "./design-system/ScrollAreaSection";
import ProgressSection from "./design-system/ProgressSection";
import AlertDialogSection from "./design-system/AlertDialogSection";
import BreadcrumbSection from "./design-system/BreadcrumbSection";
import SelectSection from "./design-system/SelectSection";
import RadioGroupSection from "./design-system/RadioGroupSection";
import SidebarSection from "./design-system/SidebarSection";
import CollapsibleSection from "./design-system/CollapsibleSection";
import ToggleSection from "./design-system/ToggleSection";
import ToastSection from "./design-system/ToastSection";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const platformTypography = [
  {
    component: "PageHeader",
    element: "h1",
    className: "text-xl font-semibold text-foreground",
    description: "Titre principal des pages admin et integrateur",
    preview: "Clients",
  },
  {
    component: "CardTitle",
    element: "h3",
    className: "text-2xl font-semibold leading-none tracking-tight text-foreground",
    description: "Titre des cartes (Card)",
    preview: "Titre de carte",
  },
  {
    component: "CardDescription",
    element: "p",
    className: "text-sm text-secondary-foreground",
    description: "Description sous les titres de cartes",
    preview: "Description complementaire de la carte",
  },
  {
    component: "DialogTitle / SheetTitle",
    element: "h2",
    className: "text-lg font-semibold leading-none tracking-tight text-foreground",
    description: "Titre des modales, drawers et sheets",
    preview: "Modifier l'element",
  },
  {
    component: "TableHead",
    element: "th",
    className: "text-[14px] font-semibold text-secondary-foreground bg-muted",
    description: "En-tetes de colonnes des tableaux",
    preview: "Nom du champ",
  },
  {
    component: "Label",
    element: "label",
    className: "text-sm font-medium leading-none text-foreground",
    description: "Labels de formulaires",
    preview: "Nom du client",
  },
  {
    component: "Chip",
    element: "span",
    className: "text-[12px] font-medium text-foreground",
    description: "Texte des chips et tags",
    preview: "Admin Delta",
  },
  {
    component: "SidebarGroupLabel",
    element: "div",
    className: "text-xs font-medium text-secondary-foreground",
    description: "Labels de groupes dans la sidebar",
    preview: "NAVIGATION",
  },
  {
    component: "TabsTrigger",
    element: "button",
    className: "text-sm font-semibold text-foreground",
    description: "Onglet actif (couleur #5342F2, border-b 3px)",
    preview: "Onglet actif",
  },
  {
    component: "Button (default)",
    element: "button",
    className: "text-[16px] font-medium",
    description: "Texte des boutons taille par defaut",
    preview: "Sauvegarder",
  },
  {
    component: "Button (sm)",
    element: "button",
    className: "text-[14px] font-medium",
    description: "Texte des boutons taille petite",
    preview: "Modifier",
  },
  {
    component: "AlertTitle",
    element: "h5",
    className: "font-medium leading-none tracking-tight",
    description: "Titre des alertes et notifications",
    preview: "Attention",
  },
  {
    component: "Breadcrumb",
    element: "nav",
    className: "text-sm text-secondary-foreground",
    description: "Fil d'ariane / navigation secondaire",
    preview: "Admin / Clients / Detail",
  },
  {
    component: "Texte secondaire",
    element: "span",
    className: "text-xs text-secondary-foreground",
    description: "Texte d'aide, dates, metadonnees",
    preview: "Cree le 09/03/2026",
  },
  {
    component: "Section header (uppercase)",
    element: "h3",
    className: "text-sm font-semibold text-secondary-foreground uppercase tracking-wide",
    description: "Titres de sections dans les formulaires",
    preview: "INFORMATIONS GENERALES",
  },
];

const sections = [
  { id: "typography", label: "Typography" },
  { id: "colors", label: "Couleurs" },
  { id: "buttons", label: "Boutons" },
  { id: "switch", label: "Switch" },
  { id: "alert", label: "Alerte" },
  { id: "alert-dialog", label: "Alert Dialog" },
  { id: "avatar", label: "Avatar" },
  { id: "breadcrumb", label: "Breadcrumb" },
  { id: "calendar", label: "Calendar" },
  { id: "card", label: "Card" },
  { id: "checkbox", label: "Checkbox" },
  { id: "collapsible", label: "Collapsible" },
  { id: "command", label: "Command" },
  { id: "dialog", label: "Dialog" },
  { id: "menu", label: "Dropdown Menu" },
  { id: "form", label: "Form" },
  { id: "text-input", label: "Input" },
  { id: "label", label: "Label" },
  { id: "popover", label: "Popover & Hover Card" },
  { id: "progress", label: "Progress" },
  { id: "radio-group", label: "Radio Group" },
  { id: "scroll-area", label: "Scroll Area" },
  { id: "select", label: "Select" },
  { id: "separator", label: "Separator" },
  { id: "panel", label: "Sheet" },
  { id: "sidebar", label: "Sidebar" },
  { id: "skeleton", label: "Skeleton" },
  { id: "tab", label: "Tabs" },
  { id: "table", label: "Table" },
  { id: "textarea", label: "Textarea" },
  { id: "toast", label: "Toast (Sonner)" },
  { id: "toggle", label: "Toggle" },
  { id: "tooltip", label: "Tooltip" },
] as const;

type SectionId = (typeof sections)[number]["id"] | "all";

function TypographyContent() {
  return (
    <section className="space-y-10">
      <div className="space-y-6">
        <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
          Typography
        </h2>
        <div className="space-y-0 divide-y divide-border border border-border rounded-lg overflow-hidden">
          {typographyItems.map((item) => (
            <div key={item.name} className="flex items-baseline gap-8 px-5 py-4 bg-card">
              <div className="w-32 shrink-0">
                <span className="text-xs text-muted-foreground font-medium">{item.name}</span>
                <span className="block text-xs text-muted-foreground">{item.size} · Raleway</span>
              </div>
              <p className={`${item.className} font-display leading-tight text-foreground`}>
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
          Typographie des composants
        </h2>
        <p className="text-sm text-muted-foreground">
          Styles typographiques utilises dans les composants de la plateforme.
        </p>
        <div className="space-y-0 divide-y divide-border border border-border rounded-lg overflow-hidden">
          {platformTypography.map((item) => (
            <div key={item.component} className="flex items-start gap-6 px-5 py-4 bg-card">
              <div className="w-48 shrink-0 space-y-1">
                <span className="text-sm font-semibold text-foreground">{item.component}</span>
                <span className="block text-xs text-muted-foreground">&lt;{item.element}&gt;</span>
                <code className="block text-[11px] text-muted-foreground/80 font-mono leading-relaxed">
                  {item.className}
                </code>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">{item.description}</p>
                <p className={item.className}>{item.preview}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ColorsContent() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Couleurs
      </h2>
      <div className="space-y-8">
        {colorPalettes.map((palette) => (
          <div key={palette.name}>
            <h3 className="text-[14px] font-semibold text-foreground mb-3">{palette.label}</h3>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {palette.shades.map((shade) => (
                <div
                  key={shade.shade}
                  className="flex-1 flex flex-col items-center justify-end"
                  style={{ backgroundColor: shade.hex, minHeight: 80 }}
                >
                  <span
                    className="text-[10px] font-semibold mb-1"
                    style={{ color: isLightColor(shade.hex) ? "#37394D" : "#F4F6F9" }}
                  >
                    {shade.shade}
                  </span>
                  <span
                    className="text-[9px] font-mono mb-2"
                    style={{ color: isLightColor(shade.hex) ? "#616785" : "#CBCFDE" }}
                  >
                    {shade.hex}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const sectionComponents: Record<Exclude<SectionId, "all">, React.FC> = {
  typography: TypographyContent,
  colors: ColorsContent,
  buttons: ButtonsSection,
  switch: SwitchSection,
  alert: AlertSection,
  "alert-dialog": AlertDialogSection,
  avatar: AvatarSection,
  breadcrumb: BreadcrumbSection,
  calendar: CalendarSection,
  card: CardSection,
  checkbox: CheckboxSection,
  collapsible: CollapsibleSection,
  command: CommandSection,
  dialog: DialogSection,
  menu: MenuSection,
  form: FormSection,
  "text-input": TextInputSection,
  label: LabelSection,
  popover: PopoverSection,
  progress: ProgressSection,
  "radio-group": RadioGroupSection,
  "scroll-area": ScrollAreaSection,
  select: SelectSection,
  separator: SeparatorSection,
  panel: PanelSection,
  sidebar: SidebarSection,
  skeleton: SkeletonSection,
  tab: TabSection,
  table: TableSection,
  textarea: TextareaSection,
  toast: ToastSection,
  toggle: ToggleSection,
  tooltip: TooltipSection,
};

export default function ComponentsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("all");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      {/* Header avec navigation */}
      <div className="border-b bg-card px-6 py-3 flex items-center gap-6 shrink-0">
        <h1 className="text-lg font-semibold text-foreground mr-4">Design System</h1>
        <button
          className="text-sm font-medium text-primary border-b-2 border-primary pb-1"
        >
          Composants shadcn
        </button>
        <button
          onClick={() => navigate("/design-system/wrappers")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground pb-1"
        >
          Wrappers custom
        </button>
      </div>

      <div className="full-bleed flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-[16rem] border-r shrink-0 flex flex-col">
          <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
            Composants shadcn
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <button
              onClick={() => setActiveSection("all")}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm transition-colors",
                "hover:bg-accent/50",
                activeSection === "all" && "bg-accent font-medium border-l-2 border-primary"
              )}
            >
              Tout
            </button>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-sm transition-colors",
                  "hover:bg-accent/50",
                  activeSection === s.id && "bg-accent font-medium border-l-2 border-primary"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-5xl">
          {activeSection === "all" ? (
            <div className="space-y-12">
              {sections.map((s) => {
                const Component = sectionComponents[s.id];
                return <Component key={s.id} />;
              })}
            </div>
          ) : (
            (() => { const C = sectionComponents[activeSection]; return <C />; })()
          )}
        </div>
      </div>
    </div>
  );
}
