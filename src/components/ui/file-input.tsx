import * as React from "react";

export interface FileInputProps {
  /** Accepted file types (e.g. ".csv", ".csv,.txt") */
  accept?: string;
  /** Called when a file is selected */
  onChange: (file: File) => void;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ accept, onChange }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onChange(file);
      }
      // Reset so the same file can be re-selected
      e.target.value = "";
    };

    return (
      <input
        ref={ref}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    );
  },
);
FileInput.displayName = "FileInput";

export { FileInput };
