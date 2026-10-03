import React from 'react';
import { Play, Pause, RotateCcw, RotateCw, Repeat, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AudioPlayer } from '@/hooks/useAudioPlayer';
import { formatPreciseTime, formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import Waveform from './Waveform';

interface AudioPlayerPanelProps {
  player: AudioPlayer;
  audioUrl: string;
  theme: string;
}

const SPEEDS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];

const AudioPlayerPanel: React.FC<AudioPlayerPanelProps> = ({ player, audioUrl, theme }) => {
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    muted,
    abLoop,
    togglePlay,
    seek,
    skip,
    setPlaybackRate,
    setVolume,
    setMuted,
    setAbLoop,
  } = player;

  const loopActive = abLoop.a !== null && abLoop.b !== null && abLoop.b > abLoop.a;

  return (
    <section className="flex flex-col gap-4 p-6" aria-label="Playback controls">
      <Waveform
        audioRef={audioRef}
        audioUrl={audioUrl}
        duration={duration}
        currentTime={currentTime}
        abLoop={abLoop}
        theme={theme}
        onSeek={seek}
      />
      <div className="flex justify-between text-[11px] font-mono font-medium text-muted-foreground -mt-2">
        <span className="tabular-nums">{formatPreciseTime(currentTime)}</span>
        <span className="tabular-nums">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(-5)}
          className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
          title="Back 5s (←)"
          aria-label="Back 5 seconds"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button
          onClick={togglePlay}
          size="icon"
          className="h-16 w-16 rounded-full hover:scale-105 transition-all shadow-lg hover:shadow-primary/30"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="size-7 fill-current" /> : <Play className="size-7 ml-1 fill-current" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(5)}
          className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
          title="Forward 5s (→)"
          aria-label="Forward 5 seconds"
        >
          <RotateCw className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/40">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Speed</span>
          <select
            className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Volume</span>
          <div className="flex items-center gap-1.5 h-[30px]">
            <button
              onClick={() => setMuted(!muted)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={muted ? 'Unmute' : 'Mute'}
              title={muted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
              aria-label="Volume"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">A-B Loop</span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={abLoop.a !== null ? 'default' : 'outline'}
              className="flex-1 h-[30px] px-0 text-xs font-mono"
              onClick={() => setAbLoop({ a: currentTime, b: abLoop.b !== null && abLoop.b > currentTime ? abLoop.b : null })}
              title={abLoop.a !== null ? `Loop start ${formatPreciseTime(abLoop.a)}` : 'Set loop start'}
            >
              A
            </Button>
            <Button
              size="sm"
              variant={abLoop.b !== null ? 'default' : 'outline'}
              className="flex-1 h-[30px] px-0 text-xs font-mono"
              disabled={abLoop.a === null || currentTime <= abLoop.a}
              onClick={() => setAbLoop({ a: abLoop.a, b: currentTime })}
              title={abLoop.b !== null ? `Loop end ${formatPreciseTime(abLoop.b)}` : 'Set loop end'}
            >
              B
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn('h-[30px] w-[30px] px-0', loopActive ? 'text-primary' : 'text-muted-foreground')}
              disabled={abLoop.a === null && abLoop.b === null}
              onClick={() => setAbLoop({ a: null, b: null })}
              title="Clear loop"
              aria-label="Clear loop"
            >
              <Repeat className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AudioPlayerPanel;
