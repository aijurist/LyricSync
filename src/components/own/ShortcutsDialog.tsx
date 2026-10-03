import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'],
  ['← / →', 'Seek 5 seconds'],
  ['Shift + ← / →', 'Previous / next line'],
  ['↑ / ↓', 'Volume'],
  ['M', 'Mute'],
  ['E', 'Toggle edit mode'],
  ['F', 'Toggle auto-scroll'],
  ['[ / ]', 'Shift all lyrics ±0.1s'],
  ['Ctrl + Z', 'Undo'],
  ['Ctrl + Shift + Z', 'Redo'],
  ['?', 'Show this help'],
];

const ShortcutsDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-sm rounded-2xl border bg-popover p-6 shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcuts-title" className="text-lg font-semibold">
            Keyboard shortcuts
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="space-y-2">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys} className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">{action}</dt>
              <dd>
                <kbd className="px-2 py-0.5 rounded-md border bg-muted font-mono text-xs">{keys}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default ShortcutsDialog;
