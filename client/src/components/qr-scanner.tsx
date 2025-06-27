import { Scanner } from '@yudiel/react-qr-scanner';
import { useState } from 'react';
import '../styles/qr-scanner.css';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: unknown) => void;
}

type ScanMode = 'scanner' | 'manual';

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [mode, setMode] = useState<ScanMode>('scanner');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown) => {
    setError(err instanceof Error ? err.message : String(err));
    if (onError) {
      onError(err);
    }
  };

  const handleScan = (detectedCodes: { rawValue: string }[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      onScan(detectedCodes[0].rawValue);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="mb-4 flex justify-center space-x-4">
        <button
          className={`px-4 py-2 rounded ${
            mode === 'scanner' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setMode('scanner')}
        >
          Scanner
        </button>
        <button
          className={`px-4 py-2 rounded ${
            mode === 'manual' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setMode('manual')}
        >
          Manual Input
        </button>
      </div>

      {mode === 'scanner' ? (
        <div className="qr-scanner-wrapper">
          <Scanner
            onScan={handleScan}
            onError={handleError}
          />
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter table ID manually"
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Submit
          </button>
        </form>
      )}

      {error && (
        <div className="mt-2 text-red-500 text-center">
          {error}
        </div>
      )}
    </div>
  );
} 