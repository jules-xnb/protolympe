import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useCurrentClientDesignConfig, useUpsertClientDesignConfig, getEffectiveDesignConfig } from '@/hooks/useClientDesignConfig';
import { useUploadClientLogo, useDeleteClientLogo } from '@/hooks/useClientLogo';
import {
  getTextOnColor,
  isValidHex,
  loadGoogleFont,
  APPROVED_GOOGLE_FONTS,
  BORDER_RADIUS_PRESETS,
  DEFAULT_DESIGN_CONFIG,
} from '@/lib/design/color-utils';
import { buildCssVars } from '@/components/layout/UserFinalThemeWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FloatingInput } from '@/components/ui/floating-input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/admin/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Palette, Type, Sliders, RotateCcw, Save, Eye, ImageIcon, Upload, X, Mountain, TextCursorInput, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Live Preview component — isolated with CSS vars via inline style
// ---------------------------------------------------------------------------

function DesignPreview({ cssVars, logoUrl, appName }: { cssVars: CSSProperties; logoUrl: string | null; appName: string }) {
  return (
    <div
      data-space="user-final"
      style={cssVars}
      className="rounded-lg border border-border bg-background overflow-auto"
    >
      {/* Mini navbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo client"
            className="max-h-8 w-auto object-contain"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
              <Mountain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-sidebar-foreground">{appName || 'Olympe'}</span>
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Aperçu navbar</span>
      </div>

      <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Prévisualisation</h2>
        <p className="text-sm text-muted-foreground">Aperçu en temps réel du thème client</p>
      </div>

      {/* Boutons */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Boutons</p>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Bouton primaire
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors px-4 py-2 border border-primary text-foreground bg-transparent hover:bg-primary/10"
          >
            Bouton outline
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Bouton secondaire
          </button>
          <button
            disabled
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors px-4 py-2 bg-primary text-primary-foreground opacity-30 pointer-events-none"
          >
            Désactivé
          </button>
        </div>
      </div>

      <Separator />

      {/* Typographie */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typographie</p>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Titre H1 — Olympe Platform</h1>
          <p className="text-base text-foreground">
            Paragraphe standard. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <a href="#" className="text-primary underline-offset-4 hover:underline text-sm">
            Lien d'exemple
          </a>
        </div>
      </div>

      <Separator />

      {/* Input */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formulaire</p>
        <div className="space-y-1 max-w-xs">
          <label className="text-sm font-medium text-foreground">Champ texte</label>
          <input
            type="text"
            placeholder="Saisir une valeur..."
            defaultValue=""
            className="flex h-10 w-full rounded-[calc(var(--radius)-2px)] border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <Separator />

      {/* Card */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Card</p>
        <div className="rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-sm p-4 max-w-sm">
          <div className="font-semibold mb-1">Titre de la card</div>
          <p className="text-sm text-muted-foreground">
            Contenu de la card avec une description courte pour illustrer l'arrondi et la couleur de fond.
          </p>
          <div className="mt-3">
            <button className="inline-flex items-center justify-center rounded-[var(--radius)] text-sm font-medium transition-colors px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              Action
            </button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Badge & Alert */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Badges & Alertes</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-[calc(var(--radius)-2px)] border px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground">
            Primaire
          </span>
          <span className="inline-flex items-center rounded-[calc(var(--radius)-2px)] border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
            Secondaire
          </span>
          <span className="inline-flex items-center rounded-[calc(var(--radius)-2px)] border border-input px-2.5 py-0.5 text-xs font-semibold text-foreground">
            Outline
          </span>
        </div>
        <div className="rounded-[var(--radius)] border border-border p-4 bg-card max-w-md">
          <div className="flex gap-2 items-start">
            <span className="mt-0.5 text-primary">ℹ</span>
            <div>
              <div className="font-medium text-foreground text-sm">Alerte d'information</div>
              <div className="text-sm text-muted-foreground mt-1">
                Ceci est un message d'alerte utilisant les couleurs du thème actif.
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Table */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tableau</p>
        <div className="rounded-[var(--radius)] border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { name: 'Alice Martin', status: 'Actif', role: 'Administrateur' },
                { name: 'Bob Durand', status: 'Inactif', role: 'Utilisateur' },
                { name: 'Claire Petit', status: 'Actif', role: 'Modérateur' },
              ].map((row, i) => (
                <tr key={i} className="bg-background hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 text-foreground">{row.name}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-[calc(var(--radius)-2px)] px-2 py-0.5 text-xs font-medium ${
                      row.status === 'Actif'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>{/* end p-6 */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientDesignPage() {
  const { selectedClient } = useViewMode();
  const { data: savedConfig, isLoading } = useCurrentClientDesignConfig();
  const upsert = useUpsertClientDesignConfig();
  const uploadLogo = useUploadClientLogo();
  const deleteLogo = useDeleteClientLogo();

  // Local form state (for live preview)
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_DESIGN_CONFIG.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_DESIGN_CONFIG.secondary_color);
  const [borderRadius, setBorderRadius] = useState(DEFAULT_DESIGN_CONFIG.border_radius);
  const [fontFamily, setFontFamily] = useState<string>(DEFAULT_DESIGN_CONFIG.font_family);

  // Logo / app name state
  const [logoMode, setLogoMode] = useState<'image' | 'text'>('image');
  const [appName, setAppName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form with loaded config
  useEffect(() => {
    if (savedConfig) {
      setPrimaryColor(savedConfig.primary_color);
      setSecondaryColor(savedConfig.secondary_color);
      setBorderRadius(savedConfig.border_radius);
      setFontFamily(savedConfig.font_family);
      setLogoUrl(savedConfig.logo_url ?? null);
      if (savedConfig.app_name) {
        setAppName(savedConfig.app_name);
        setLogoMode('text');
      } else {
        setLogoMode('image');
      }
    }
  }, [savedConfig]);

  // Logo upload handler
  const handleLogoFile = useCallback((file: File) => {
    setLogoError(null);
    uploadLogo.mutate(file, {
      onSuccess: (url) => setLogoUrl(url),
      onError: (err) => setLogoError(err.message),
    });
  }, [uploadLogo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  }, [handleLogoFile]);

  const handleDeleteLogo = useCallback(() => {
    deleteLogo.mutate(logoUrl, {
      onSuccess: () => setLogoUrl(null),
    });
  }, [deleteLogo, logoUrl]);

  // Load font preview when font changes in the form
  useEffect(() => {
    loadGoogleFont(fontFamily);
  }, [fontFamily]);

  // Derived: text on primary/secondary (computed in real-time)
  const textOnPrimary = isValidHex(primaryColor) ? getTextOnColor(primaryColor) : '#ffffff';
  const textOnSecondary = isValidHex(secondaryColor) ? getTextOnColor(secondaryColor) : '#000000';

  // CSS vars for live preview
  const previewCssVars: CSSProperties = isValidHex(primaryColor) && isValidHex(secondaryColor)
    ? buildCssVars({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        text_on_primary: textOnPrimary,
        text_on_secondary: textOnSecondary,
        border_radius: borderRadius,
        font_family: fontFamily,
      })
    : {};

  const handleSave = () => {
    upsert.mutate({
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      border_radius: borderRadius,
      font_family: fontFamily,
      app_name: logoMode === 'text' ? (appName.trim() || null) : null,
    });
  };

  const handleReset = () => {
    const last = getEffectiveDesignConfig(savedConfig);
    setPrimaryColor(last.primary_color);
    setSecondaryColor(last.secondary_color);
    setBorderRadius(last.border_radius);
    setFontFamily(last.font_family);
    setAppName(last.app_name ?? '');
    setLogoMode(last.app_name ? 'text' : 'image');
  };

  const effective = getEffectiveDesignConfig(savedConfig);
  const hasUnsavedChanges =
    primaryColor !== effective.primary_color ||
    secondaryColor !== effective.secondary_color ||
    borderRadius !== effective.border_radius ||
    fontFamily !== effective.font_family ||
    (logoMode === 'text' ? (appName.trim() || null) : null) !== effective.app_name;

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Aucun client sélectionné.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Affichage & Design"
      >
        <Button variant="outline" onClick={handleReset} disabled={upsert.isPending}>
          Réinitialiser
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button onClick={handleSave} disabled={upsert.isPending || !hasUnsavedChanges}>
          {upsert.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          <Save className="h-4 w-4" />
        </Button>
      </PageHeader>

      {hasUnsavedChanges && (
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertTitle>Modifications non sauvegardées</AlertTitle>
          <AlertDescription>
            La prévisualisation reflète vos changements en temps réel. Cliquez sur "Sauvegarder" pour les appliquer.
          </AlertDescription>
        </Alert>
      )}

      {/* Two-column layout: config | preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* --- Configuration panel --- */}
        <div className="space-y-6">

          {/* Section Logo */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4 text-primary" />
                Identité visuelle
              </CardTitle>
              <CardDescription>
                Choisissez d'afficher un logo image ou un nom texte dans la navigation de l'espace utilisateur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={logoMode} onValueChange={(v) => setLogoMode(v as 'image' | 'text')}>
                <TabsList className="w-full">
                  <TabsTrigger value="image" className="flex-1 gap-2">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Logo image
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex-1 gap-2">
                    <TextCursorInput className="h-3.5 w-3.5" />
                    Nom texte
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="mt-4 space-y-4">
                  {logoUrl ? (
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex h-14 w-28 items-center justify-center rounded-md border border-border bg-background overflow-hidden shrink-0">
                        <img
                          src={logoUrl}
                          alt="Logo client"
                          className="max-h-10 max-w-[6.5rem] w-auto object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">Logo personnalisé</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Affiché dans la navbar de l'espace utilisateur
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteLogo}
                        disabled={deleteLogo.isPending}
                        className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        Supprimer
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed
                        cursor-pointer transition-colors
                        ${isDragOver
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
                        }
                      `}
                    >
                      {uploadLogo.isPending ? (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-primary animate-bounce" />
                          <p className="text-sm text-muted-foreground">Upload en cours…</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground">
                              Glissez votre logo ici ou{' '}
                              <span className="text-primary underline">parcourir</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              SVG, PNG ou JPEG — max 2 MB
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {logoError && (
                    <p className="text-xs text-destructive">{logoError}</p>
                  )}
                </TabsContent>

                <TabsContent value="text" className="mt-4 space-y-2">
                  <FloatingInput
                    label="Nom de l'outil"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    maxLength={40}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ce nom s'affichera en texte dans la barre de navigation à la place du logo.
                  </p>
                </TabsContent>
              </Tabs>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/svg+xml,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoFile(file);
                  e.target.value = '';
                }}
              />
            </CardContent>
          </Card>

          {/* Section Couleurs */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-primary" />
                Couleurs
              </CardTitle>
              <CardDescription>
                Couleurs principales appliquées aux composants de l'espace utilisateur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Primary color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Couleur primaire</Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={isValidHex(primaryColor) ? primaryColor : '#4E3BD7'}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 rounded-[calc(var(--radius,0.5rem)-2px)] border border-input cursor-pointer p-0.5 bg-transparent"
                    />
                  </div>
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#4E3BD7"
                    className={`w-32 font-mono text-sm ${!isValidHex(primaryColor) ? 'border-destructive' : ''}`}
                    maxLength={7}
                  />
                  {isValidHex(primaryColor) && (
                    <Chip
                      className="text-xs shrink-0"
                      style={{
                        backgroundColor: primaryColor,
                        color: textOnPrimary,
                        borderColor: 'transparent',
                      }}
                    >
                      Texte {textOnPrimary === '#ffffff' ? 'blanc' : 'noir'}
                    </Chip>
                  )}
                </div>
                {!isValidHex(primaryColor) && (
                  <p className="text-xs text-destructive">Format invalide. Utilisez #RRGGBB</p>
                )}
              </div>

              {/* Secondary color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Couleur secondaire</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={isValidHex(secondaryColor) ? secondaryColor : '#E8E9F2'}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-10 rounded-[calc(var(--radius,0.5rem)-2px)] border border-input cursor-pointer p-0.5 bg-transparent"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#E8E9F2"
                    className={`w-32 font-mono text-sm ${!isValidHex(secondaryColor) ? 'border-destructive' : ''}`}
                    maxLength={7}
                  />
                  {isValidHex(secondaryColor) && (
                    <Chip
                      className="text-xs shrink-0"
                      style={{
                        backgroundColor: secondaryColor,
                        color: textOnSecondary,
                        borderColor: 'transparent',
                      }}
                    >
                      Texte {textOnSecondary === '#ffffff' ? 'blanc' : 'noir'}
                    </Chip>
                  )}
                </div>
                {!isValidHex(secondaryColor) && (
                  <p className="text-xs text-destructive">Format invalide. Utilisez #RRGGBB</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section Border Radius */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sliders className="h-4 w-4 text-primary" />
                Arrondi des composants
              </CardTitle>
              <CardDescription>
                Appliqué aux boutons, cards, inputs, badges, alertes et tableaux.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {BORDER_RADIUS_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setBorderRadius(preset.value)}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                      borderRadius === preset.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    }`}
                    style={{
                      borderRadius: preset.value >= 9999 ? '9999px' : `${preset.value}rem`,
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Valeur personnalisée</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {borderRadius >= 9999 ? '9999px (pill)' : `${borderRadius}rem`}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={0.125}
                  value={[Math.min(borderRadius, 2)]}
                  onValueChange={([val]) => setBorderRadius(val)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 (sharp)</span>
                  <span>2rem</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Typographie */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Type className="h-4 w-4 text-primary" />
                Typographie
              </CardTitle>
              <CardDescription>
                Police de caractères affichée dans l'espace utilisateur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Police (font family)</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir une police…" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVED_GOOGLE_FONTS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: `'${font.value}', system-ui, sans-serif` }}>
                          {font.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  La taille de base et la graisse sont gérées globalement par le design system.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- Preview panel --- */}
        <div className="sticky top-4 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Prévisualisation en direct
            </span>
          </div>
          <DesignPreview cssVars={previewCssVars} logoUrl={logoMode === 'image' ? logoUrl : null} appName={logoMode === 'text' ? appName : ''} />
        </div>
      </div>
    </div>
  );
}
