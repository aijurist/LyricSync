import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Zap, Music, FileAudio, FileText, X, RotateCcw, Sparkles, ChevronDown, Wand2, AudioWaveform } from 'lucide-react';
import type { TranscribeOptions } from '@/types';
import type { JobState } from '@/hooks/useTranscriber';
import { LANGUAGES } from '@/lib/languages';
import { MODELS, type ModelSize } from '@/lib/models';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { isLyricsFile } from '@/lib/files';
import { parseLyricsText } from '@/lib/align';

interface FileUploadPanelProps {
  audioFile: File | null;
  job: JobState;
  hasLyrics: boolean;
  options: TranscribeOptions;
  setOptions: (options: TranscribeOptions) => void;
  onFileSelected: (file: File) => void;
  onImportLyrics: (file: File) => void;
  onLoadSample: () => void;
  onTranscribe: () => void;
  onQuickSync: () => void;
  onCancel: () => void;
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  webgpu: boolean | null;
}

function useElapsed(active: boolean, startedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [active]);
  return active ? Math.max(0, (now - startedAt) / 1000) : 0;
}

const PHASE_LABELS = {
  idle: '',
  decoding: 'Decoding audio…',
  loading: 'Downloading model (one-time)…',
  transcribing: 'Transcribing on your device…',
  syncing: 'Aligning lyrics to the audio…',
};

const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  audioFile,
  job,
  hasLyrics,
  options,
  setOptions,
  onFileSelected,
  onImportLyrics,
  onLoadSample,
  onTranscribe,
  onQuickSync,
  onCancel,
  lyrics,
  setLyrics,
  webgpu,
}) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showLyrics, setShowLyrics] = useState(() => !!lyrics);
  const hasPastedLyrics = lyrics.trim().length > 0;
  const busy = job.phase !== 'idle';
  const elapsed = useElapsed(busy, job.startedAt);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (isLyricsFile(file)) onImportLyrics(file);
      else onFileSelected(file);
    }
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!busy) setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!busy) handleFiles(e.dataTransfer.files);
    },
  };

  const selectClass =
    'w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50';

  return (
    <section className="w-full" aria-labelledby="source-audio-heading">
      <h2
        id="source-audio-heading"
        className="flex items-center gap-2 mb-4 text-xs font-bold tracking-widest text-muted-foreground uppercase"
      >
        <Music className="h-3 w-3" />
        Source Audio
      </h2>

      <Input
        ref={audioInputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.ogg,.opus,.webm,.aac"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
      <Input
        ref={lyricsInputRef}
        type="file"
        accept=".lrc,.srt,.vtt,.json"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {!audioFile ? (
        <>
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            {...dropHandlers}
            className={cn(
              'group relative flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed transition-all cursor-pointer',
              dragOver
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : 'border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50',
            )}
          >
            <div className="p-3 rounded-full bg-background shadow-sm group-hover:scale-110 transition-transform duration-300 mb-3">
              <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {dragOver ? 'Drop it!' : 'Drop a track or click to browse'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">MP3, WAV, M4A, FLAC, OGG · never uploaded anywhere</p>
          </button>
          <button
            type="button"
            onClick={onLoadSample}
            className="mt-3 flex items-center gap-1.5 text-[11px] text-primary hover:underline"
          >
            <Sparkles className="h-3 w-3" />
            No track handy? Try the sample
          </button>
        </>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2" {...dropHandlers}>
          <div
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl bg-muted/40 border transition-colors',
              dragOver ? 'border-primary' : 'border-border',
            )}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <FileAudio className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" title={audioFile.name}>
                {audioFile.name}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                {audioFile.name.split('.').pop()} · {(audioFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => audioInputRef.current?.click()}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg"
            >
              Replace
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Language</span>
              <select
                className={selectClass}
                value={options.language}
                disabled={busy}
                onChange={(e) => setOptions({ ...options, language: e.target.value })}
              >
                <option value="auto">Auto-detect</option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Model</span>
              <select
                className={selectClass}
                value={options.model}
                disabled={busy}
                onChange={(e) => setOptions({ ...options, model: e.target.value as ModelSize })}
                title={MODELS.find((m) => m.id === options.model)?.description}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.download}){m.needsGPU && webgpu === false ? ' – needs GPU' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label
            className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
            title="Cuts bass and rumble below the vocal range and evens out loudness before analysis"
          >
            <input
              type="checkbox"
              className="accent-[var(--primary)]"
              checked={options.enhanceVocals}
              disabled={busy}
              onChange={(e) => setOptions({ ...options, enhanceVocals: e.target.checked })}
            />
            Clean up audio for vocals
          </label>

          <div className="rounded-xl border border-border bg-muted/20">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium"
              onClick={() => setShowLyrics((v) => !v)}
              aria-expanded={showLyrics}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                I have the lyrics {hasPastedLyrics && <span className="text-primary">· {parseLyricsText(lyrics).length} lines</span>}
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showLyrics && 'rotate-180')} />
            </button>
            {showLyrics && (
              <div className="px-3 pb-3 space-y-2">
                <textarea
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary resize-y min-h-28 font-mono"
                  rows={6}
                  disabled={busy}
                  placeholder={'Paste the correct lyrics, one line per line.\nSection labels like [Chorus] are ignored.'}
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your text is used exactly as written, so there are no recognition mistakes. Only the timing is detected.
                </p>
              </div>
            )}
          </div>

          {busy ? (
            <div className="space-y-2" aria-live="polite">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-primary flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  {PHASE_LABELS[job.phase]}
                </span>
                <span className="text-muted-foreground font-mono tabular-nums">
                  {job.progress !== null && `${Math.round(job.progress * 100)}% · `}
                  {formatTime(elapsed)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden relative">
                {job.progress !== null ? (
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(2, job.progress * 100)}%` }}
                  />
                ) : (
                  <div className="absolute inset-y-0 w-1/3 bg-primary rounded-full animate-[indeterminate_1.4s_ease-in-out_infinite]" />
                )}
              </div>
              {job.device && (
                <p className="text-[10px] text-muted-foreground">
                  Running on {job.device === 'webgpu' ? 'your GPU (WebGPU)' : 'your CPU (WebAssembly)'}
                </p>
              )}
              <Button variant="ghost" size="sm" onClick={onCancel} className="w-full h-8 text-xs text-muted-foreground">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          ) : (
            hasPastedLyrics ? (
              <div className="space-y-2">
                <Button onClick={onTranscribe} className="w-full h-10 font-semibold tracking-wide text-xs rounded-lg">
                  <Wand2 className="h-3.5 w-3.5" />
                  SYNC MY LYRICS WITH AI
                </Button>
                <Button
                  onClick={onQuickSync}
                  variant="outline"
                  className="w-full h-9 text-xs rounded-lg"
                  title="Detects sung syllables with signal processing. No model download and instant, but rougher timing"
                >
                  <AudioWaveform className="h-3.5 w-3.5" />
                  Quick sync: no AI, instant
                </Button>
              </div>
            ) : (
              <Button
                onClick={onTranscribe}
                variant={hasLyrics ? 'outline' : 'default'}
                className="w-full h-10 font-semibold tracking-wide text-xs rounded-lg"
              >
                {hasLyrics ? <RotateCcw className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                {hasLyrics ? 'RE-GENERATE LYRICS' : 'GENERATE LYRICS'}
              </Button>
            )
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => lyricsInputRef.current?.click()}
        disabled={busy}
        className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <FileText className="h-3 w-3" />
        Import existing lyrics (.lrc, .srt, .vtt, .json)
      </button>
    </section>
  );
};

export default FileUploadPanel;
