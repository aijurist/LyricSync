import { useCallback, useEffect, useRef, useState } from 'react';
import type { ABLoop } from '@/types';
import { readPreference, writePreference } from '@/lib/storage';

/**
 * Owns playback state for a single <audio> element. Time is sampled with
 * requestAnimationFrame while playing so word highlighting stays smooth
 * (the native `timeupdate` event only fires ~4 times a second).
 */
export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [volume, setVolumeState] = useState(() => readPreference('volume', 1));
  const [muted, setMuted] = useState(false);
  const [abLoop, setAbLoop] = useState<ABLoop>({ a: null, b: null });
  const loopRef = useRef(abLoop);
  loopRef.current = abLoop;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEmptied = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('seeked', onTime);
    audio.addEventListener('emptied', onEmptied);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('seeked', onTime);
      audio.removeEventListener('emptied', onEmptied);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        const { a, b } = loopRef.current;
        if (a !== null && b !== null && b > a && audio.currentTime >= b) {
          audio.currentTime = a;
        }
        setCurrentTime(audio.currentTime);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    writePreference('volume', volume);
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => setIsPlaying(false));
  }, []);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) play();
    else audio.pause();
  }, [play]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = Number.isFinite(audio.duration) ? audio.duration : time;
    const clamped = Math.max(0, Math.min(max, time));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const skip = useCallback(
    (delta: number) => seek((audioRef.current?.currentTime ?? 0) + delta),
    [seek],
  );

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setPlaybackRateState(rate);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
    setMuted(false);
  }, []);

  // Preserve the chosen speed when a new file is loaded
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const apply = () => {
      audio.playbackRate = playbackRate;
    };
    audio.addEventListener('loadedmetadata', apply);
    return () => audio.removeEventListener('loadedmetadata', apply);
  }, [playbackRate]);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    muted,
    abLoop,
    play,
    pause,
    togglePlay,
    seek,
    skip,
    setPlaybackRate,
    setVolume,
    setMuted,
    setAbLoop,
  };
}

export type AudioPlayer = ReturnType<typeof useAudioPlayer>;
