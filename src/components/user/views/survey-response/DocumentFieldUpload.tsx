import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  useBoDocuments,
  useUploadBoDocument,
  useDeleteBoDocument,
  downloadBoDocument,
  type BoDocument,
} from '@/hooks/useBoDocuments';
import { useT } from '@/hooks/useT';

interface DocumentFieldUploadProps {
  businessObjectId: string;
  fieldDefinitionId: string;
  disabled?: boolean;
  multiple?: boolean;
  maxSizeMb?: number;
  acceptedFormats?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentFieldUpload({
  businessObjectId,
  fieldDefinitionId,
  disabled = false,
  multiple = false,
  maxSizeMb,
  acceptedFormats,
}: DocumentFieldUploadProps) {
  const { t } = useT();
  const { data: documents = [], isLoading } = useBoDocuments(businessObjectId, fieldDefinitionId);
  const uploadDoc = useUploadBoDocument();
  const deleteDoc = useDeleteBoDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build accept string for input
  const acceptAttr = acceptedFormats
    ? acceptedFormats.split(',').map(f => `.${f.trim()}`).join(',')
    : undefined;

  const maxSizeBytes = maxSizeMb ? maxSizeMb * 1024 * 1024 : undefined;

  const canUpload = !disabled && (multiple || documents.length === 0);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      // Validate size
      if (maxSizeBytes && file.size > maxSizeBytes) {
        toast.error(t('documents.file_exceeds_max_size', { name: file.name, size: maxSizeMb }));
        continue;
      }

      // Validate format
      if (acceptedFormats) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const allowed = acceptedFormats.split(',').map(f => f.trim().toLowerCase());
        if (!allowed.includes(ext)) {
          toast.error(t('documents.format_not_accepted', { name: file.name, ext }));
          continue;
        }
      }

      try {
        await uploadDoc({ businessObjectId, fieldDefinitionId, file });
        successCount++;
      } catch {
        toast.error(t('documents.upload_error', { name: file.name }));
      }
    }

    if (successCount > 0) {
      toast.success(t('documents.files_added', { count: successCount }));
    }

    setUploading(false);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [businessObjectId, fieldDefinitionId, uploadDoc, maxSizeBytes, maxSizeMb, acceptedFormats, t]);

  const handleDelete = useCallback(async (doc: BoDocument) => {
    setDeletingId(doc.id);
    try {
      await deleteDoc(doc);
    } catch {
      toast.error(t('errors.deletion'));
    }
    setDeletingId(null);
  }, [deleteDoc, t]);

  const handleDownload = useCallback(async (doc: BoDocument) => {
    try {
      await downloadBoDocument(doc.file_path, doc.file_name);
    } catch {
      toast.error(t('errors.download'));
    }
  }, [t]);

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t('buttons.loading')}</div>;
  }

  return (
    <div className="space-y-2 w-full">
      {/* File list */}
      {documents.length > 0 && (
        <div className="space-y-1">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded border border-border px-2.5 py-1.5 text-sm"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{doc.file_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(doc.file_size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleDownload(doc)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptAttr}
            multiple={multiple}
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('documents.upload_in_progress')}</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> {t('documents.add_file')}</>
            )}
          </Button>
          {acceptedFormats && (
            <p className="text-xs text-muted-foreground">
              {maxSizeMb
                ? t('documents.accepted_formats_with_max', { formats: acceptedFormats, size: maxSizeMb })
                : t('documents.accepted_formats', { formats: acceptedFormats })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
