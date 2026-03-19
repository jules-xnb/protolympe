import { useState, useRef, DragEvent } from 'react';
import { FileInput } from '@/components/ui/file-input';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface EoUploadStepProps {
  onFileSelect: (file: File) => void;
}

export function EoUploadStep({ onFileSelect }: EoUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        onFileSelect(file);
      } else {
        toast.error('Veuillez sélectionner un fichier CSV');
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
          isDragging ? 'text-primary' : 'text-muted-foreground'
        }`} />
        <h3 className="text-lg font-medium mb-2">Sélectionnez un fichier CSV</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Le fichier doit contenir les colonnes pour le code, le nom et le code parent
        </p>
        <p className="text-sm text-muted-foreground">
          Glissez-déposez votre fichier ici ou cliquez pour parcourir
        </p>
        <FileInput
          ref={fileInputRef}
          accept=".csv"
          onChange={onFileSelect}
        />
      </div>
    </div>
  );
}
