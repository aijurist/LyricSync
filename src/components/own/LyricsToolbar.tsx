import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Edit3, LocateFixed, Redo2, Undo2, Check, Copy } from 'lucide-react';
import type { TranscriptionMeta } from '@/types';
import { EXPORT_FORMATS, type ExportFormat } from '@/lib/formats';
import { languageName } from '@/lib/languages';
import { cn } from '@/lib/utils';
import Dropdown from './Dropdown';

interface LyricsToolbarProps {
  lineCount: number;
  meta: TranscriptionMeta | null;
  isEditMode: boolean;
  setEditMode: (value: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  follow: boolean;
  setFollow: (value: boolean) => void;
  onShift: (seconds: number) => void;
  onExport: (format: ExportFormat) => void;
  onCopy: () => void;
}

const LyricsToolbar: React.FC<LyricsToolbarProps> = ({
  lineCount,
  meta,
  isEditMode,
  setEditMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  follow,
  setFollow,
  onShift,
  onExport,
  onCopy,
}) => (
  <div className="flex flex-wrap items-center gap-2 px-4 md:px-8 py-2.5 border-b bg-muted/20">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
      <span className="font-medium text-foreground">{lineCount} lines</span>
      {meta?.language && (
        <span className="px-2 py-0.5 rounded-full bg-muted border text-[10px] font-semibold uppercase tracking-wider">
          {languageName(meta.language)}
        </span>
      )}
      {meta?.source === 'ai+lyrics' && (
        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
          Your lyrics · AI timing
        </span>
      )}
      {meta?.source === 'quick' && (
        <span
          className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-[10px] font-semibold uppercase tracking-wider"
          title="Synced by signal analysis without AI, so timing is approximate"
        >
          Quick sync
        </span>
      )}
      {meta?.model && (
        <span className="px-2 py-0.5 rounded-full bg-muted border text-[10px] font-semibold uppercase tracking-wider">
          Whisper {meta.model}
        </span>
      )}
      {meta?.wordLevel === false && (
        <span
          className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-[10px] font-semibold uppercase tracking-wider"
          title="This model didn't provide word timing, so word highlights are estimated"
        >
          Estimated word timing
        </span>
      )}
    </div>

    <div className="flex items-center gap-0.5">
      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>

    <div className="flex items-center rounded-lg border bg-background/50 text-xs" title="Shift all lyrics earlier or later ([ and ])">
      <button className="px-2 py-1.5 hover:bg-muted rounded-l-lg font-mono" onClick={() => onShift(-0.1)} aria-label="Shift lyrics 0.1 seconds earlier">
        −0.1s
      </button>
      <span className="px-1 text-muted-foreground border-x py-1.5">Offset</span>
      <button className="px-2 py-1.5 hover:bg-muted rounded-r-lg font-mono" onClick={() => onShift(0.1)} aria-label="Shift lyrics 0.1 seconds later">
        +0.1s
      </button>
    </div>

    <Button
      size="icon"
      variant="ghost"
      className={cn('h-8 w-8', follow ? 'text-primary' : 'text-muted-foreground')}
      onClick={() => setFollow(!follow)}
      title={follow ? 'Auto-scroll is on (F)' : 'Auto-scroll is off (F)'}
      aria-pressed={follow}
      aria-label="Auto-scroll"
    >
      <LocateFixed className="h-4 w-4" />
    </Button>


    <Button
      variant={isEditMode ? 'default' : 'secondary'}
      size="sm"
      onClick={() => setEditMode(!isEditMode)}
      className="h-8"
      title="Toggle edit mode (E)"
    >
      {isEditMode ? <Check className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
      {isEditMode ? 'Done' : 'Edit'}
    </Button>

    <Dropdown
      trigger={({ toggle }) => (
        <Button size="sm" className="h-8" onClick={toggle}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      )}
    >
      {(close) => (
        <>
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              role="menuitem"
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex flex-col"
              onClick={() => {
                onExport(format.id);
                close();
              }}
            >
              <span className="text-sm font-medium">
                {format.label} <span className="text-muted-foreground font-mono text-xs">.{format.extension}</span>
              </span>
              <span className="text-xs text-muted-foreground">{format.description}</span>
            </button>
          ))}
          <div className="my-1 border-t" />
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-2 text-sm"
            onClick={() => {
              onCopy();
              close();
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy LRC to clipboard
          </button>
        </>
      )}
    </Dropdown>
  </div>
);

export default LyricsToolbar;
