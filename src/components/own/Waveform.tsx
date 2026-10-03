import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { ABLoop } from '@/types';

interface WaveformProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioUrl: string;
  duration: number;
  currentTime: number;
  abLoop: ABLoop;
  theme: string;
  onSeek: (time: number) => void;
}

function cssVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Waveform bound to the shared <audio> element. Falls back to a plain
 * progress bar while the waveform decodes or if decoding fails.
 */
const Waveform: React.FC<WaveformProps> = ({ audioRef, audioUrl, duration, currentTime, abLoop, theme, onSeek }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = audioRef.current;
    if (!containerRef.current || !media || !audioUrl) return;

    setReady(false);
    const ws = WaveSurfer.create({
      container: containerRef.current,
      media,
      height: 56,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      cursorWidth: 2,
      dragToSeek: true,
      waveColor: cssVar('--muted-foreground', '#888'),
      progressColor: cssVar('--primary', '#3b82f6'),
      cursorColor: cssVar('--primary', '#3b82f6'),
    });
    ws.on('ready', () => setReady(true));
    ws.on('error', () => setReady(false));
    wavesurferRef.current = ws;

    return () => {
      // Wavesurfer leaves externally supplied media elements intact on destroy
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audioRef, audioUrl]);

  // Re-colour on theme change. Deferred a frame because the parent applies
  // the theme class in its own effect, which runs after this one.
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      wavesurferRef.current?.setOptions({
        waveColor: cssVar('--muted-foreground', '#888'),
        progressColor: cssVar('--primary', '#3b82f6'),
        cursorColor: cssVar('--primary', '#3b82f6'),
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  const handleFallbackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(((e.clientX - rect.left) / rect.width) * duration);
  };

  const pct = (t: number) => `${(t / (duration || 1)) * 100}%`;

  return (
    <div className="relative">
      <div ref={containerRef} className={ready ? 'opacity-80' : 'h-0 overflow-hidden'} aria-hidden />
      {!ready && (
        <div
          className="w-full h-14 flex items-center cursor-pointer"
          onClick={handleFallbackClick}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
        >
          <div className="w-full h-2 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: duration ? pct(currentTime) : '0%' }} />
          </div>
        </div>
      )}
      {abLoop.a !== null && duration > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-yellow-500/20 border-x-2 border-yellow-500 pointer-events-none rounded-sm"
          style={{
            left: pct(abLoop.a),
            width: abLoop.b !== null && abLoop.b > abLoop.a ? pct(abLoop.b - abLoop.a) : '2px',
          }}
        />
      )}
    </div>
  );
};

export default Waveform;
