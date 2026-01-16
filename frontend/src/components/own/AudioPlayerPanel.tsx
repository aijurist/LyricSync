import type { TranscriptionResult } from "../../types";
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Play, Pause, SkipBack, SkipForward, Download, Repeat, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerPanelProps {
  audioUrl: string;
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  handlePlayPause: () => void;
  handleTimeUpdate: () => void;
  handleLoadedMetadata: () => void;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  skipBackward: () => void;
  skipForward: () => void;
  downloadLRC: () => void;
  transcriptionResult: TranscriptionResult | null;
  formatTime: (seconds: number) => string;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  abLoop: { a: number | null; b: number | null };
  setAbLoop: (ab: { a: number | null; b: number | null }) => void;
}

const AudioPlayerPanel: React.FC<AudioPlayerPanelProps> = ({
  audioUrl,
  audioRef,
  isPlaying,
  currentTime,
  duration,
  handlePlayPause,
  handleTimeUpdate,
  handleLoadedMetadata,
  handleProgressClick,
  skipBackward,
  skipForward,
  downloadLRC,
  transcriptionResult,
  formatTime,
  playbackRate,
  setPlaybackRate,
  abLoop,
  setAbLoop,
}) => {
  const setPointA = () => setAbLoop({ a: currentTime, b: abLoop.b });
  const setPointB = () => setAbLoop({ a: abLoop.a, b: currentTime });
  const clearLoop = () => setAbLoop({ a: null, b: null });



  return (
    <Card className="flex-1 border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 backdrop-blur-md overflow-hidden flex flex-col rounded-3xl">
      <CardHeader className="pb-4 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5">
        <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2 text-foreground/90">
          <Volume2 className="h-4 w-4 text-primary" />
          PLAYBACK CONTROLS
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 p-6">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => { }}
          onPause={() => { }}
          className="hidden"
        />

        {/* Progress Bar */}
        <div className="space-y-3">
          <div
            className="w-full h-3 bg-black/5 dark:bg-white/5 rounded-full cursor-pointer group relative overflow-hidden transition-all"
            onClick={handleProgressClick}
          >
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div
              className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all relative"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover:scale-110 transition-transform" />
            </div>
            {abLoop.a !== null && duration && (
              <div
                className="absolute top-0 bottom-0 bg-yellow-500/30 border-l border-r border-yellow-500 pointer-events-none"
                style={{
                  left: `${(abLoop.a / duration) * 100}%`,
                  width: abLoop.b ? `${((abLoop.b - abLoop.a) / duration) * 100}%` : '2px'
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-[11px] font-mono font-medium text-muted-foreground">
            <span className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-foreground/70">{formatTime(currentTime)}</span>
            <span className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-foreground/70">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBackward}
            className="h-12 w-12 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all hover:scale-110"
            title="Skip back 10s"
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            onClick={handlePlayPause}
            size="icon"
            className="h-20 w-20 rounded-full hover:scale-105 transition-all bg-primary text-primary-foreground border-4 border-white/50 dark:border-black/20"
          >
            {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 ml-1 fill-current" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            className="h-12 w-12 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all hover:scale-110"
            title="Skip forward 10s"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        {/* Tools */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-black/5 dark:border-white/5">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Speed</span>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 px-3 py-2 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                value={playbackRate}
                onChange={e => setPlaybackRate(Number(e.target.value))}
              >
                <option value={0.5}>0.5x (Slow)</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1.0x (Normal)</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x (Fast)</option>
                <option value={2}>2.0x</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">A-B Loop</span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={abLoop.a !== null ? "default" : "outline"}
                className={`flex-1 h-8 text-xs font-mono border-black/10 dark:border-white/10 ${abLoop.a !== null ? 'bg-primary text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                onClick={setPointA}
                title="Set Start"
              >
                A
              </Button>
              <Button
                size="sm"
                variant={abLoop.b !== null ? "default" : "outline"}
                className={`flex-1 h-8 text-xs font-mono border-black/10 dark:border-white/10 ${abLoop.b !== null ? 'bg-primary text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                onClick={setPointB}
                title="Set End"
              >
                B
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 px-0 hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
                onClick={clearLoop}
                title="Clear"
              >
                <Repeat className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {transcriptionResult && (
          <div className="mt-auto pt-4">
            <Button
              onClick={downloadLRC}
              variant="outline"
              className="w-full h-12 border-primary/30 bg-primary/5 hover:bg-primary/20 text-primary font-bold tracking-wide transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              DOWNLOAD .LRC FILE
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioPlayerPanel;
