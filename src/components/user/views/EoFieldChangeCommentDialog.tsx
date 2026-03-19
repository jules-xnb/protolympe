import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { ArrowRight } from 'lucide-react';
import { useT } from '@/hooks/useT';

interface EoFieldChangeCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName: string;
  oldValue: string;
  newValue: string;
  required: boolean;
  onConfirm: (comment: string) => void;
  isPending?: boolean;
}

export function EoFieldChangeCommentDialog({
  open,
  onOpenChange,
  fieldName,
  oldValue,
  newValue,
  required,
  onConfirm,
  isPending,
}: EoFieldChangeCommentDialogProps) {
  const { t } = useT();
  const [comment, setComment] = useState('');

  const canSubmit = !required || comment.trim().length > 0;

  const handleConfirm = () => {
    onConfirm(comment.trim());
    setComment('');
  };

  const handleClose = (v: boolean) => {
    if (!v) setComment('');
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle>{t('eo.change_comment_title')}</DialogTitle>
          <DialogDescription>
            {required
              ? t('eo.change_comment_required', { field: fieldName })
              : t('eo.change_comment_optional', { field: fieldName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-3 py-3">
          <Chip variant="outline" className="text-sm">
            {oldValue || t('eo.empty_value')}
          </Chip>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <Chip variant="default" className="text-sm">
            {newValue || t('eo.empty_value')}
          </Chip>
        </div>

        <div className="space-y-2">
          <Label>
            {t('eo.comment_label')} {required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('eo.change_reason_placeholder')}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit || isPending}>
            {t('buttons.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
