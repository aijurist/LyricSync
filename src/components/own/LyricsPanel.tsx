import React, { memo, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Trash2, Plus, Save, X, Clock, Music2, Crosshair, Upload } from 'lucide-react';
import type { LyricChunk } from '@/types';
import { editChunk } from '@/lib/lyrics';
import { formatPreciseTime, formatTime, parseTime } from '@/lib/time';
import { cn } from '@/lib/utils';

interface LyricsPanelProps {
  chunks: LyricChunk[] | null;
  activeIndex: number;
  currentTime: number;
  isEditMode: boolean;
  editingIndex: number | null;
  setEditingIndex: (index: number | null) => void;
  follow: boolean;
  hasAudio: boolean;
  onSeek: (time: number) => void;
  onUpdateChunk: (index: number, chunk: LyricChunk) => void;
  onDeleteChunk: (index: number) => void;
  onInsertAfter: (index: number) => void;
}

const USER_SCROLL_PAUSE_MS = 3000;

const LyricsPanel: React.FC<LyricsPanelProps> = ({
  chunks,
  activeIndex,
  currentTime,
  isEditMode,
  editingIndex,
  setEditingIndex,
  follow,
  hasAudio,
  onSeek,
  onUpdateChunk,
  onDeleteChunk,
  onInsertAfter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUserScroll = useRef(0);

  // Keep the active line centred, unless the user is scrolling or editing
  useEffect(() => {
    if (!follow || activeIndex < 0 || editingIndex !== null) return;
    if (Date.now() - lastUserScroll.current < USER_SCROLL_PAUSE_MS) return;
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex, follow, editingIndex]);

  if (!chunks) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
          <Music2 className="h-10 w-10 text-muted-foreground/60" />
        </div>
        <div className="max-w-md space-y-3">
          <h3 className="text-xl font-semibold text-foreground">No lyrics yet</h3>
          <p className="text-muted-foreground leading-relaxed text-sm">
            {hasAudio
              ? 'Hit “Generate lyrics” to transcribe this track, or import an existing .lrc / .srt file to fine-tune its timing.'
              : 'Drop an audio file anywhere on the page to get started. LyricSync will transcribe it with word-level timing you can play back, edit and export.'}
          </p>
          {!hasAudio && (
            <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5 pt-2">
              <Upload className="h-3 w-3" /> Drag & drop works everywhere
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!chunks.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4">
        <p className="text-muted-foreground">No lyrics were detected. Try a different language, or add lines manually.</p>
        <Button variant="outline" onClick={() => onInsertAfter(-1)}>
          <Plus className="h-4 w-4" /> Add a line
        </Button>
      </div>
    );
  }

  const markUserScroll = () => {
    lastUserScroll.current = Date.now();
  };

  return (
    <div
      ref={containerRef}
      onWheel={markUserScroll}
      onTouchMove={markUserScroll}
      className="h-full overflow-y-auto px-4 md:px-8 py-8"
    >
      <ol className="space-y-2 max-w-4xl mx-auto pb-[40vh]" aria-label="Lyrics">
        {chunks.map((chunk, index) => {
          const isActive = index === activeIndex;
          return (
            <LyricLine
              key={index}
              index={index}
              chunk={chunk}
              isActive={isActive}
              distance={activeIndex < 0 ? 0 : Math.abs(index - activeIndex)}
              // Only the active line needs live time; others stay memoised
              time={isActive ? currentTime : -1}
              isEditMode={isEditMode}
              isEditing={editingIndex === index}
              onSeek={onSeek}
              setEditingIndex={setEditingIndex}
              onUpdate={onUpdateChunk}
              onDelete={onDeleteChunk}
              onInsertAfter={onInsertAfter}
              playbackTime={editingIndex === index ? currentTime : 0}
            />
          );
        })}
      </ol>
    </div>
  );
};

interface LyricLineProps {
  index: number;
  chunk: LyricChunk;
  isActive: boolean;
  distance: number;
  time: number;
  isEditMode: boolean;
  isEditing: boolean;
  playbackTime: number;
  onSeek: (time: number) => void;
  setEditingIndex: (index: number | null) => void;
  onUpdate: (index: number, chunk: LyricChunk) => void;
  onDelete: (index: number) => void;
  onInsertAfter: (index: number) => void;
}

const LyricLine = memo(function LyricLine({
  index,
  chunk,
  isActive,
  distance,
  time,
  isEditMode,
  isEditing,
  playbackTime,
  onSeek,
  setEditingIndex,
  onUpdate,
  onDelete,
  onInsertAfter,
}: LyricLineProps) {
  const fade = isEditMode || isActive ? '' : distance <= 2 ? 'opacity-70' : 'opacity-40';

  return (
    <li
      data-line={index}
      className={cn(
        'group relative rounded-2xl px-5 py-4 transition-all duration-500 ease-out border border-transparent',
        isActive ? 'bg-primary/5 border-primary/10' : 'hover:bg-muted/40',
        !isEditMode && 'cursor-pointer',
        fade,
      )}
      onClick={() => !isEditMode && onSeek(chunk.timestamp[0])}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full',
            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <span
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-mono tabular-nums',
            isActive ? 'text-primary font-bold' : 'text-muted-foreground',
          )}
        >
          <Clock className="h-3 w-3" />
          {isEditMode ? `${formatPreciseTime(chunk.timestamp[0])} – ${formatPreciseTime(chunk.timestamp[1])}` : formatTime(chunk.timestamp[0])}
        </span>
      </div>

      {isEditing ? (
        <LineEditor
          chunk={chunk}
          playbackTime={playbackTime}
          onSave={(updated) => {
            onUpdate(index, updated);
            setEditingIndex(null);
          }}
          onCancel={() => setEditingIndex(null)}
        />
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-xl md:text-3xl leading-snug tracking-tight transition-colors duration-300',
                isActive ? 'font-bold text-foreground' : 'font-medium text-muted-foreground group-hover:text-foreground/80',
              )}
            >
              {chunk.words?.length
                ? chunk.words.map((word, wi) => {
                    const past = isActive && time > word.timestamp[1];
                    const current = isActive && time >= word.timestamp[0] && time <= word.timestamp[1];
                    return (
                      <React.Fragment key={wi}>
                        <span
                          className={cn(
                            'rounded-sm transition-colors duration-150',
                            isActive && (current ? 'text-primary' : past ? 'text-foreground' : 'text-foreground/35'),
                            !isEditMode && 'hover:underline decoration-primary/50 underline-offset-4',
                          )}
                          onClick={(e) => {
                            if (isEditMode) return;
                            e.stopPropagation();
                            onSeek(word.timestamp[0]);
                          }}
                        >
                          {word.word}
                        </span>{' '}
                      </React.Fragment>
                    );
                  })
                : chunk.text}
            </p>
          </div>

          {isEditMode && (
            <div className="flex flex-col sm:flex-row gap-1 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setEditingIndex(index)} title="Edit line" aria-label={`Edit line ${index + 1}`}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => onInsertAfter(index)} title="Insert line below" aria-label={`Insert line after ${index + 1}`}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full hover:bg-destructive/15 hover:text-destructive"
                onClick={() => onDelete(index)}
                title="Delete line"
                aria-label={`Delete line ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
});

interface LineEditorProps {
  chunk: LyricChunk;
  playbackTime: number;
  onSave: (chunk: LyricChunk) => void;
  onCancel: () => void;
}

function LineEditor({ chunk, playbackTime, onSave, onCancel }: LineEditorProps) {
  const [text, setText] = useState(chunk.text);
  const [start, setStart] = useState(formatPreciseTime(chunk.timestamp[0]));
  const [end, setEnd] = useState(formatPreciseTime(chunk.timestamp[1]));

  const startValue = parseTime(start);
  const endValue = parseTime(end);
  const error =
    !text.trim()
      ? 'Line text cannot be empty'
      : startValue === null || endValue === null
        ? 'Use mm:ss.cc for times'
        : endValue < startValue
          ? 'End time must be after the start'
          : null;

  const save = () => {
    if (error || startValue === null || endValue === null) return;
    onSave(editChunk(chunk, text, startValue, endValue));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      save();
    }
  };

  const timeField = (label: string, value: string, setValue: (v: string) => void, invalid: boolean) => (
    <div>
      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 flex items-center justify-between tracking-wider">
        {label}
        <button
          type="button"
          className="flex items-center gap-1 normal-case font-medium text-primary hover:underline"
          onClick={() => setValue(formatPreciseTime(playbackTime))}
          title="Use the current playback position"
        >
          <Crosshair className="h-3 w-3" /> now
        </button>
      </label>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={invalid}
        className="h-9 font-mono text-sm"
        placeholder="mm:ss.cc"
      />
    </div>
  );

  return (
    <div className="space-y-3 bg-background/70 p-4 rounded-xl border backdrop-blur-md" onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[80px] resize-none text-lg font-medium"
        placeholder="Enter lyric text…"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        {timeField('Start', start, setStart, startValue === null)}
        {timeField('End', end, setEnd, endValue === null || (startValue !== null && endValue < startValue))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={save} disabled={!!error} className="flex-1 h-9">
          <Save className="h-4 w-4" /> Save <kbd className="ml-1 text-[10px] opacity-60">⌘↵</kbd>
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1 h-9">
          <X className="h-4 w-4" /> Cancel <kbd className="ml-1 text-[10px] opacity-60">Esc</kbd>
        </Button>
      </div>
    </div>
  );
}

export default LyricsPanel;
