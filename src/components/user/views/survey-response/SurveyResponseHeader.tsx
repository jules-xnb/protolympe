import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useT } from '@/hooks/useT';

// ── Types ────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  currentSectionName: string;
  eoName?: string;
  campaignName?: string;
  responseStatus: string;
  onBack: () => void;
}

// ── Section header (top of main content area) ──────────────────────────────

export function SectionHeader({
  currentSectionName,
  eoName,
  campaignName,
  responseStatus,
  onBack,
}: SectionHeaderProps) {
  const { t } = useT();
  return (
    <div className="flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {currentSectionName}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {eoName} — {campaignName}
            </p>
          </div>
          {responseStatus === 'rejected' && (
            <Chip variant="error">{t('survey.corrections_requested')}</Chip>
          )}
        </div>
      </div>
    </div>
  );
}
