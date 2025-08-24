import type { TranscriptionResult } from "../../types";
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Play, Pause, SkipBack, SkipForward, Download, Repeat } from "lucide-react";
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
  // A/B Looping logic
  const setPointA = () => setAbLoop({ a: currentTime, b: abLoop.b });
  const setPointB = () => setAbLoop({ a: abLoop.a, b: currentTime });
  const clearLoop = () => setAbLoop({ a: null, b: null });

  // Show loop status
  const abLoopActive = abLoop.a !== null && abLoop.b !== null && abLoop.b > abLoop.a!;

  return (
    <Card className="mb-4 flex-1 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1 bg-primary/10 rounded">
            <Play className="h-4 w-4 text-primary" />
          </div>
          Audio Player
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => {}}
          onPause={() => {}}
          className="hidden"
        />

        {/* Progress Bar */}
        <div className="mb-2">
          <div 
            className="w-full h-2 bg-muted rounded-full cursor-pointer group relative overflow-hidden"
            onClick={handleProgressClick}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        {/* Controls */}
        <div className="relative flex items-center justify-center">
          {/* Left side controls */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={skipBackward}
              className="h-8 w-8 hover:bg-primary/10"
              title="Skip back 10s"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              onClick={handlePlayPause}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={skipForward}
              className="h-8 w-8 hover:bg-primary/10"
              title="Skip forward 10s"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Right side controls */}
          <div className="absolute right-0 flex flex-col gap-2">
            {/* Playback Speed */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Speed</span>
              <select
                className="rounded border px-1 py-0.5 text-xs bg-background"
                value={playbackRate}
                onChange={e => setPlaybackRate(Number(e.target.value))}
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
            {/* A/B Loop Controls */}
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="px-2 py-1 text-xs" onClick={setPointA} title="Set Loop Start (A)">A</Button>
              <Button size="sm" variant="outline" className="px-2 py-1 text-xs" onClick={setPointB} title="Set Loop End (B)">B</Button>
              <Button size="sm" variant="ghost" className="px-2 py-1 text-xs" onClick={clearLoop} title="Clear Loop"><Repeat className="h-3 w-3" /></Button>
            </div>
            {/* Loop Status */}
            {abLoopActive && (
              <div className="text-xs text-primary text-right">
                Loop: {formatTime(abLoop.a!)} - {formatTime(abLoop.b!)}
              </div>
            )}
          </div>
        </div>
        {/* Download Button */}
        {transcriptionResult && (
          <div className="mt-auto pt-4">
            <Button 
              onClick={downloadLRC}
              variant="outline"
              className="w-full hover:bg-primary/5"
            >
              <Download className="h-4 w-4 mr-2" />
              Download LRC File
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Compatible with media players & karaoke software
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioPlayerPanel;
