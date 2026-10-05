import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sun, Moon, Info, Keyboard, AudioLines, Upload, ShieldCheck, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InfoPanel from '@/components/own/InfoPanel';
import FileUploadPanel from '@/components/own/FileUploadPanel';
import AudioPlayerPanel from '@/components/own/AudioPlayerPanel';
import LyricsPanel from '@/components/own/LyricsPanel';
import LyricsToolbar from '@/components/own/LyricsToolbar';
import ShortcutsDialog from '@/components/own/ShortcutsDialog';
import { useToast } from '@/components/own/toast-context';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useHistory } from '@/hooks/useHistory';
import { useTheme } from '@/hooks/useTheme';
import { useTranscriber } from '@/hooks/useTranscriber';
import { useWebGPU } from '@/hooks/useWebGPU';
import { baseName, isAudioFile, isLyricsFile } from '@/lib/files';
import { EXPORT_FORMATS, exportLyrics, parseLyricsFile, type ExportFormat } from '@/lib/formats';
import { findActiveChunkIndex, shiftChunks } from '@/lib/lyrics';
import { MODELS, recommendedModel, type ModelSize } from '@/lib/models';
import { downloadText, loadSession, readPreference, saveSession, writePreference } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { LyricChunk, TranscribeOptions, TranscriptionMeta } from '@/types';

const DEFAULT_OPTIONS: Omit<TranscribeOptions, 'model'> = { language: 'auto', enhanceVocals: true };

const modelExists = (id: string): id is ModelSize => MODELS.some((m) => m.id === id);

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

function App() {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const webgpu = useWebGPU();
  const transcriber = useTranscriber();
  const { job, cancel: cancelTranscription } = transcriber;
  const player = useAudioPlayer();
  const { seek, togglePlay, skip, setVolume, setMuted, setAbLoop } = player;

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [options, setOptionsState] = useState<TranscribeOptions>(() => {
    const saved = readPreference<Partial<TranscribeOptions>>('options', {});
    return { ...DEFAULT_OPTIONS, ...saved, model: saved.model && modelExists(saved.model) ? saved.model : 'small' };
  });
  const [lyricsText, setLyricsText] = useState('');
  const modelChosen = useRef(!!readPreference<Partial<TranscribeOptions>>('options', {}).model);

  // Default to the best model the device can run, until the user picks one
  useEffect(() => {
    if (webgpu === null || modelChosen.current) return;
    setOptionsState((o) => ({ ...o, model: recommendedModel(webgpu) }));
  }, [webgpu]);

  const lyrics = useHistory<LyricChunk[] | null>(null);
  const chunks = lyrics.value;
  const { set: setChunks, reset: resetChunks, undo, redo } = lyrics;
  const [meta, setMeta] = useState<TranscriptionMeta | null>(null);

  const [isEditMode, setEditMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [follow, setFollow] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(() => readPreference('sidebarWidth', 38));
  const [resizing, setResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeIndex = useMemo(
    () => (chunks ? findActiveChunkIndex(chunks, player.currentTime) : -1),
    [chunks, player.currentTime],
  );

  const setOptions = (next: TranscribeOptions) => {
    if (next.model !== options.model) modelChosen.current = true;
    setOptionsState(next);
    writePreference('options', next);
  };

  // --- Files -----------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const selectAudioFile = useCallback(
    (file: File) => {
      if (!isAudioFile(file)) {
        toast.show(`“${file.name}” doesn't look like an audio file.`, 'error');
        return;
      }
      cancelTranscription();
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setLyricsText('');
      setAbLoop({ a: null, b: null });
      setEditingIndex(null);
      setEditMode(false);

      const saved = loadSession(file);
      if (saved?.chunks) {
        resetChunks(saved.chunks);
        setMeta(saved.meta ?? null);
        toast.show('Restored your saved lyrics for this track.', 'success');
      } else {
        resetChunks(null);
        setMeta(null);
      }
    },
    [setAbLoop, resetChunks, toast, cancelTranscription],
  );

  const importLyrics = useCallback(
    async (file: File) => {
      try {
        const imported = parseLyricsFile(file.name, await file.text());
        if (!imported.length) throw new Error('No timed lines found');
        resetChunks(imported);
        setMeta(null);
        toast.show(`Imported ${imported.length} lines from ${file.name}.`, 'success');
      } catch (err) {
        toast.show(`Couldn't import ${file.name}: ${err instanceof Error ? err.message : err}`, 'error');
      }
    },
    [resetChunks, toast],
  );

  const handleDroppedFiles = useCallback(
    (files: FileList) => {
      for (const file of Array.from(files)) {
        if (isLyricsFile(file)) importLyrics(file);
        else selectAudioFile(file);
      }
    },
    [importLyrics, selectAudioFile],
  );

  // Autosave edits so a refresh doesn't lose work
  useEffect(() => {
    if (!audioFile || !chunks) return;
    const id = setTimeout(() => saveSession(audioFile, chunks, meta ?? undefined), 400);
    return () => clearTimeout(id);
  }, [audioFile, chunks, meta]);

  // --- Transcription ---------------------------------------------------------

  const applyResult = (result: LyricChunk[], resultMeta: TranscriptionMeta) => {
    // Re-syncing is undoable; a first result starts fresh history
    if (chunks) setChunks(result);
    else resetChunks(result);
    setMeta(resultMeta);
    setEditingIndex(null);
  };

  const reportError = (err: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') toast.show('Cancelled.');
    else toast.show(err instanceof Error ? err.message : 'Something went wrong.', 'error');
  };

  const runTranscription = async () => {
    if (!audioFile) return;
    const lyrics = lyricsText.trim() ? lyricsText : undefined;
    try {
      const { chunks: result, meta: resultMeta } = await transcriber.transcribe(audioFile, options, lyrics);
      applyResult(result, resultMeta);
      const secs = Math.round(resultMeta.processingSeconds ?? 0);
      if (resultMeta.source === 'ai+lyrics') {
        const rate = resultMeta.matchRate ?? 0;
        toast.show(
          rate < 0.35
            ? `Synced, but only ${Math.round(rate * 100)}% of words matched what was heard. Check that the lyrics belong to this song, or try a larger model.`
            : `Synced your lyrics (${Math.round(rate * 100)}% of words confirmed by the AI) in ${secs}s.`,
          rate < 0.35 ? 'info' : 'success',
        );
      } else {
        toast.show(
          result.length
            ? `Done! ${result.length} lines in ${secs}s. If words are wrong, paste the real lyrics under “I have the lyrics” to fix them.`
            : 'Finished, but no vocals were detected. Try a larger model or set the language.',
          result.length ? 'success' : 'info',
        );
      }
    } catch (err) {
      reportError(err);
    }
  };

  const runQuickSync = async () => {
    if (!audioFile || !lyricsText.trim()) return;
    try {
      const { chunks: result, meta: resultMeta } = await transcriber.quickSync(audioFile, options, lyricsText);
      applyResult(result, resultMeta);
      toast.show(
        `Quick-synced ${result.length} lines in ${(resultMeta.processingSeconds ?? 0).toFixed(1)}s. Timing is approximate; nudge lines in Edit mode or use AI sync for precision.`,
        'success',
      );
    } catch (err) {
      reportError(err);
    }
  };

  const loadSample = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}samples/sample.mp3`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      selectAudioFile(new File([await res.blob()], 'sample.mp3', { type: 'audio/mpeg' }));
    } catch {
      toast.show("Couldn't load the sample track.", 'error');
    }
  };

  // --- Editing ---------------------------------------------------------------

  const updateChunk = useCallback(
    (index: number, chunk: LyricChunk) =>
      setChunks((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[index] = chunk;
        // Keep lines in time order if an edit moved one past its neighbours
        return next.sort((a, b) => a.timestamp[0] - b.timestamp[0]);
      }),
    [setChunks],
  );

  const deleteChunk = useCallback(
    (index: number) => {
      setChunks((prev) => prev && prev.filter((_, i) => i !== index));
      setEditingIndex(null);
    },
    [setChunks],
  );

  const insertAfter = useCallback(
    (index: number) => {
      setChunks((prev) => {
        const list = prev ?? [];
        const prevEnd = index >= 0 ? list[index]?.timestamp[1] ?? 0 : 0;
        const nextStart = list[index + 1]?.timestamp[0];
        const start = prevEnd;
        const end = nextStart !== undefined && nextStart > start ? nextStart : start + 3;
        const next = [...list];
        next.splice(index + 1, 0, { text: 'New line', timestamp: [start, end] });
        return next;
      });
      setEditMode(true);
      setEditingIndex(index + 1);
    },
    [setChunks],
  );

  const shiftAll = useCallback(
    (seconds: number) => setChunks((prev) => prev && shiftChunks(prev, seconds)),
    [setChunks],
  );

  const seekToLine = useCallback(
    (delta: number) => {
      if (!chunks?.length) return;
      const target = Math.max(0, Math.min(chunks.length - 1, activeIndex + delta));
      seek(chunks[target].timestamp[0]);
    },
    [chunks, activeIndex, seek],
  );

  // --- Export --------------------------------------------------------------

  const exportMeta = () => ({
    title: audioFile ? baseName(audioFile.name) : undefined,
    language: meta?.language,
  });

  const handleExport = (format: ExportFormat) => {
    if (!chunks) return;
    const info = EXPORT_FORMATS.find((f) => f.id === format)!;
    const name = audioFile ? baseName(audioFile.name) : 'lyrics';
    downloadText(exportLyrics(format, chunks, exportMeta()), `${name}.${info.extension}`, info.mime);
  };

  const copyLRC = async () => {
    if (!chunks) return;
    try {
      await navigator.clipboard.writeText(exportLyrics('lrc', chunks, exportMeta()));
      toast.show('LRC copied to clipboard.', 'success');
    } catch {
      toast.show('Clipboard access was blocked by the browser.', 'error');
    }
  };

  // --- Keyboard shortcuts ----------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !isTyping(e.target)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y' && !isTyping(e.target)) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod || e.altKey || isTyping(e.target)) return;

      switch (e.key) {
        case ' ':
          // Let focused buttons handle Space themselves
          if (e.target instanceof HTMLButtonElement) return;
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) seekToLine(-1);
          else skip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) seekToLine(1);
          else skip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(player.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(player.volume - 0.1);
          break;
        case 'm':
          setMuted(!player.muted);
          break;
        case 'e':
          if (chunks) {
            setEditMode((v) => !v);
            setEditingIndex(null);
          }
          break;
        case 'f':
          setFollow((v) => !v);
          break;
        case '[':
          if (chunks) shiftAll(-0.1);
          break;
        case ']':
          if (chunks) shiftAll(0.1);
          break;
        case '?':
          setShowShortcuts(true);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, skip, seekToLine, setVolume, setMuted, player.volume, player.muted, chunks, shiftAll, undo, redo]);

  // --- Page-wide drag & drop -------------------------------------------------

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setPageDrag(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setPageDrag(false);
    };
    const onOver = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const onDrop = (e: DragEvent) => {
      depth = 0;
      setPageDrag(false);
      // The upload panel handles its own drops and marks them as handled
      if (e.defaultPrevented) return;
      e.preventDefault();
      if (e.dataTransfer?.files.length && job.phase === 'idle') handleDroppedFiles(e.dataTransfer.files);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleDroppedFiles, job.phase]);

  // --- Resizable sidebar -----------------------------------------------------

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSidebarWidth(Math.max(25, Math.min(60, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const onUp = () => setResizing(false);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  useEffect(() => {
    if (!resizing) writePreference('sidebarWidth', sidebarWidth);
  }, [resizing, sidebarWidth]);

  // --- Render ----------------------------------------------------------------

  const engineDevice = transcriber.device ?? (webgpu ? 'webgpu' : webgpu === false ? 'wasm' : null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-chart-2/10 rounded-full blur-[150px]" />
        </div>
      )}

      {/* Hidden, shared audio element driven by useAudioPlayer */}
      <audio ref={player.audioRef} src={audioUrl || undefined} preload="metadata" className="hidden" />

      <div
        ref={containerRef}
        className="relative z-10 flex flex-col md:flex-row md:h-screen md:overflow-hidden"
        style={{ '--sidebar-w': `${sidebarWidth}%` } as React.CSSProperties}
      >
        {/* Sidebar */}
        <aside className="flex flex-col md:w-[var(--sidebar-w)] md:min-w-[320px] md:max-w-[640px] bg-muted/20 border-b md:border-b-0 md:border-r">
          <div className="flex-1 md:overflow-y-auto">
            <div className="p-6 space-y-6">
              <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-md">
                    <AudioLines className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">LyricSync</h1>
                    <p className="text-xs text-muted-foreground">AI-synced lyrics, word by word</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowInfo((v) => !v)} aria-label="About" aria-expanded={showInfo}>
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowShortcuts(true)} aria-label="Keyboard shortcuts">
                    <Keyboard className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleTheme} aria-label="Toggle theme">
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </div>
              </header>

              {showInfo && <InfoPanel />}

              <FileUploadPanel
                audioFile={audioFile}
                job={job}
                hasLyrics={!!chunks}
                options={options}
                setOptions={setOptions}
                onFileSelected={selectAudioFile}
                onImportLyrics={importLyrics}
                onLoadSample={loadSample}
                onTranscribe={runTranscription}
                onQuickSync={runQuickSync}
                onCancel={cancelTranscription}
                lyrics={lyricsText}
                setLyrics={setLyricsText}
                webgpu={webgpu}
              />
            </div>
          </div>

          {audioUrl && (
            <div className="md:sticky bottom-0 bg-background/80 backdrop-blur-xl border-t">
              <AudioPlayerPanel player={player} audioUrl={audioUrl} theme={theme} />
            </div>
          )}
        </aside>

        {/* Resize handle (desktop only) */}
        <div
          className="hidden md:flex w-1.5 -mx-[3px] z-20 cursor-col-resize group items-stretch justify-center"
          onPointerDown={(e) => {
            e.preventDefault();
            setResizing(true);
          }}
          onDoubleClick={() => setSidebarWidth(38)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        >
          <div className={cn('w-px transition-colors group-hover:bg-primary', resizing ? 'bg-primary' : 'bg-transparent')} />
        </div>

        {/* Lyrics */}
        <main className="flex-1 min-w-0 flex flex-col min-h-[70vh] md:min-h-0">
          <div className="px-4 md:px-8 py-4 border-b flex items-center justify-between gap-4 bg-background/60 backdrop-blur-md">
            <h2 className="text-lg font-bold tracking-tight truncate">
              {audioFile ? baseName(audioFile.name) : 'Synchronized Lyrics'}
            </h2>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
              title={
                engineDevice === 'webgpu'
                  ? 'Transcription runs on your GPU via WebGPU. Audio never leaves this device.'
                  : 'Transcription runs on your CPU via WebAssembly (WebGPU unavailable). Audio never leaves this device.'
              }
            >
              {engineDevice === 'wasm' ? <Cpu className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              On-device{engineDevice ? ` · ${engineDevice === 'webgpu' ? 'GPU' : 'CPU'}` : ''}
            </div>
          </div>

          {chunks && (
            <LyricsToolbar
              lineCount={chunks.length}
              meta={meta}
              isEditMode={isEditMode}
              setEditMode={(v) => {
                setEditMode(v);
                setEditingIndex(null);
              }}
              canUndo={lyrics.canUndo}
              canRedo={lyrics.canRedo}
              onUndo={undo}
              onRedo={redo}
              follow={follow}
              setFollow={setFollow}
              onShift={shiftAll}
              onExport={handleExport}
              onCopy={copyLRC}
            />
          )}

          <div className="flex-1 min-h-0 relative">
            <LyricsPanel
              chunks={chunks}
              activeIndex={activeIndex}
              currentTime={player.currentTime}
              isEditMode={isEditMode}
              editingIndex={editingIndex}
              setEditingIndex={setEditingIndex}
              follow={follow}
              hasAudio={!!audioFile}
              onSeek={seek}
              onUpdateChunk={updateChunk}
              onDeleteChunk={deleteChunk}
              onInsertAfter={insertAfter}
            />
          </div>
        </main>
      </div>

      {pageDrag && job.phase === 'idle' && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-primary px-16 py-12 bg-primary/5">
            <Upload className="h-10 w-10 text-primary" />
            <p className="text-lg font-semibold">Drop audio or a lyrics file</p>
          </div>
        </div>
      )}

      <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}

export default App;
