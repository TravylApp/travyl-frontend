import { AlertTriangle, Save, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onSaveAndContinue: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  targetLabel?: string;
}

export function UnsavedChangesDialog({
  isOpen,
  onSaveAndContinue,
  onDiscard,
  onCancel,
  isSaving = false,
  targetLabel,
}: UnsavedChangesDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Trap focus and handle Escape
  useEffect(() => {
    if (!isOpen) return;

    // Focus the cancel button on open
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
      // Trap focus within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
      aria-describedby="unsaved-changes-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 fade-in duration-200 overflow-hidden"
      >
        {/* Header accent */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h3
                id="unsaved-changes-title"
                className="text-lg font-semibold text-gray-900"
              >
                Unsaved Changes
              </h3>
              <p
                id="unsaved-changes-desc"
                className="text-sm text-gray-600 mt-1"
              >
                You have unsaved changes
                {targetLabel ? ` that will be lost if you switch to ${targetLabel}` : ' that will be lost'}
                . What would you like to do?
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-6">
            <button
              onClick={onSaveAndContinue}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save & Continue'}
            </button>
            <button
              onClick={onDiscard}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white text-red-600 border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <Trash2 size={18} />
              Discard Changes
            </button>
            <button
              ref={cancelBtnRef}
              onClick={onCancel}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
            >
              Stay on This Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
