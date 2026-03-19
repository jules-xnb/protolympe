import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FieldDateFormatConfigProps {
  fieldType: string;
  dateFormat: string;
  onDateFormatChange: (value: string) => void;
}

export function FieldDateFormatConfig({
  fieldType,
  dateFormat,
  onDateFormatChange,
}: FieldDateFormatConfigProps) {
  const defaultFormat = fieldType === 'datetime'
    ? 'dd/MM/yyyy HH:mm'
    : fieldType === 'time'
      ? 'HH:mm'
      : 'dd/MM/yyyy';

  return (
    <div className="space-y-2">
      <Label>Format d'affichage</Label>
      <Select
        value={dateFormat || defaultFormat}
        onValueChange={onDateFormatChange}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fieldType === 'datetime' ? (
            <>
              <SelectItem value="dd/MM/yyyy HH:mm">jj/mm/aaaa hh:mm</SelectItem>
              <SelectItem value="MM/dd/yyyy HH:mm">mm/jj/aaaa hh:mm</SelectItem>
              <SelectItem value="yyyy-MM-dd HH:mm">aaaa-mm-jj hh:mm</SelectItem>
              <SelectItem value="dd MMMM yyyy HH:mm">jj mois aaaa hh:mm</SelectItem>
              <SelectItem value="dd/MM/yyyy HH:mm:ss">jj/mm/aaaa hh:mm:ss</SelectItem>
            </>
          ) : fieldType === 'time' ? (
            <>
              <SelectItem value="HH:mm">hh:mm (24h)</SelectItem>
              <SelectItem value="HH:mm:ss">hh:mm:ss (24h)</SelectItem>
              <SelectItem value="hh:mm a">hh:mm (12h)</SelectItem>
            </>
          ) : (
            <>
              <SelectItem value="dd/MM/yyyy">jj/mm/aaaa</SelectItem>
              <SelectItem value="MM/dd/yyyy">mm/jj/aaaa</SelectItem>
              <SelectItem value="yyyy-MM-dd">aaaa-mm-jj</SelectItem>
              <SelectItem value="dd MMMM yyyy">jj mois aaaa</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
