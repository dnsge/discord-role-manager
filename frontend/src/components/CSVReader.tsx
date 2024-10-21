import React, { useCallback } from "react";
import Papa from "papaparse";

interface CSVReaderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpload: (data: any[]) => void;
}

export const CSVReader: React.FC<CSVReaderProps> = ({ onUpload }) => {
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        complete: (results) => {
          onUpload(results.data);
        },
      });
    },
    [onUpload]
  );

  return (
    <div>
      <h2>Upload Member Data</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
    </div>
  );
};
