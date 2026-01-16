import { Sun, Moon } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Edit3 } from "lucide-react";
import InfoPanel from "@/components/own/InfoPanel";
import FileUploadPanel from "@/components/own/FileUploadPanel";
import AudioPlayerPanel from "@/components/own/AudioPlayerPanel";
import LyricsPanel from "@/components/own/LyricsPanel";
import type { LyricChunk, TranscriptionResult } from "./types";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState(-1);
  const [manuallySelectedChunk, setManuallySelectedChunk] = useState(-1);
  const [showInfo, setShowInfo] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [backendStatus, setBackendStatus] = useState<'ok' | 'down' | 'checking'>('checking');

  const checkBackendHealth = useCallback(async () => {
    setBackendStatus('checking');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      console.log('Checking backend health at http://localhost:8000/health...');
      const res = await fetch('http://localhost:8000/health', { signal: controller.signal });
      clearTimeout(timeout);
      console.log('Backend health response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Backend health data:', data);
        if (data.status === 'ok') {
          console.log('Backend is OK');
          setBackendStatus('ok');
        } else {
          console.warn('Backend returned status not OK:', data);
          setBackendStatus('down');
        }
      } else {
        console.error('Backend response not OK:', res.statusText);
        setBackendStatus('down');
      }
    } catch (e) {
      console.error('Error checking backend health:', e);
      clearTimeout(timeout);
      setBackendStatus('down');
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setTranscriptionResult(null);
      setActiveChunkIndex(-1);
      setManuallySelectedChunk(-1);
      setEditingIndex(null);
      setIsEditMode(false);
    } else {
      alert('Please select a valid audio file (MP3, WAV, M4A, etc.)');
    }
  };

  const processAudio = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    let progressInterval: NodeJS.Timeout | null = null;
    let succeeded = false;
    try {
      // Simulate realistic processing progress
      progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 95) {
            if (progressInterval) clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 10 + 5;
        });
      }, 300);

      const formData = new FormData();
      formData.append('audio', audioFile, audioFile.name);

      const response = await fetch('http://localhost:8000/ai/stt', {
        method: 'POST',
        body: formData,
      });

      let data: { result: TranscriptionResult } | null = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error('Failed to parse backend JSON:', jsonErr);
        throw new Error('Failed to parse backend response as JSON.');
      }
      console.log('Backend response:', data);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (data && data.result && typeof data.result === 'object') {
        setTranscriptionResult(data.result);
        succeeded = true;
        if (progressInterval) clearInterval(progressInterval);
        setProcessingProgress(100);
        setIsProcessing(false);
      } else {
        console.error('Unexpected response format:', data);
        throw new Error('Received unexpected response format from server');
      }
    } catch (error) {
      console.error('Error processing audio:', error);

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('ECONNRESET') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Connection was reset. The backend may have crashed or the response was too large. Please check the backend logs and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      alert(`Error processing audio: ${errorMessage}. Make sure the backend server is running on localhost:8000.`);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsProcessing(false);
      setProcessingProgress(succeeded ? 100 : 0);
      if (succeeded) {
        setTimeout(() => setProcessingProgress(0), 600);
      }
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (!isPlaying) return;
    if (abLoop.a !== null && abLoop.b !== null && abLoop.b > abLoop.a) {
      const handler = () => {
        if (audioEl.currentTime >= abLoop.b!) {
          audioEl.currentTime = abLoop.a!;
        }
      };
      audioEl.addEventListener('timeupdate', handler);
      return () => {
        audioEl.removeEventListener('timeupdate', handler);
      };
    }
  }, [abLoop, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleLyricClick = (chunk: LyricChunk, index: number) => {
    setManuallySelectedChunk(index);
    setActiveChunkIndex(index);

    const seekTime = chunk.timestamp[0];
    handleSeek(seekTime);

    setTimeout(() => {
      const element = document.getElementById(`lyric-chunk-${index}`);
      if (element && lyricsContainerRef.current) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }, 100);

    setTimeout(() => {
      setManuallySelectedChunk(-1);
    }, 1000);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const newTime = (x / width) * duration;
      handleSeek(newTime);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, currentTime - 10);
      handleSeek(newTime);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(duration, currentTime + 10);
      handleSeek(newTime);
    }
  };

  useEffect(() => {
    if (transcriptionResult?.chunks && manuallySelectedChunk === -1) {
      let activeIndex = -1;

      for (let i = 0; i < transcriptionResult.chunks.length; i++) {
        const chunk = transcriptionResult.chunks[i];
        const startTime = chunk.timestamp[0];
        const endTime = chunk.timestamp[1];

        if (currentTime >= startTime && currentTime <= endTime) {
          activeIndex = i;
          break;
        }
        else if (currentTime >= startTime) {
          const nextChunk = transcriptionResult.chunks[i + 1];
          if (!nextChunk || currentTime < nextChunk.timestamp[0]) {
            activeIndex = i;
          }
        }
      }

      if (activeIndex !== activeChunkIndex) {
        setActiveChunkIndex(activeIndex);

        if (activeIndex >= 0) {
          setTimeout(() => {
            const element = document.getElementById(`lyric-chunk-${activeIndex}`);
            if (element && lyricsContainerRef.current) {
              element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
              });
            }
          }, 100);
        }
      }
    }
  }, [currentTime, transcriptionResult, manuallySelectedChunk, activeChunkIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const startEditing = (index: number) => {
    if (!transcriptionResult?.chunks[index]) return;

    const chunk = transcriptionResult.chunks[index];
    setEditingIndex(index);
    setEditText(chunk.text);
    setEditStartTime(formatTime(chunk.timestamp[0]));
    setEditEndTime(formatTime(chunk.timestamp[1]));
    setIsEditMode(true);
  };

  const saveEdit = () => {
    if (editingIndex === null || !transcriptionResult) return;

    const newChunks = [...transcriptionResult.chunks];
    newChunks[editingIndex] = {
      text: editText,
      timestamp: [parseTimeInput(editStartTime), parseTimeInput(editEndTime)]
    };

    setTranscriptionResult({
      ...transcriptionResult,
      chunks: newChunks
    });

    setEditingIndex(null);
    setEditText('');
    setEditStartTime('');
    setEditEndTime('');
    setIsEditMode(false);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
    setEditStartTime('');
    setEditEndTime('');
    setIsEditMode(false);
  };

  const deleteChunk = (index: number) => {
    if (!transcriptionResult) return;

    const newChunks = transcriptionResult.chunks.filter((_, i) => i !== index);
    setTranscriptionResult({
      ...transcriptionResult,
      chunks: newChunks
    });
  };

  const addChunk = (index: number) => {
    if (!transcriptionResult) return;

    const newChunk: LyricChunk = {
      text: 'New lyric line',
      timestamp: [currentTime, Math.min(currentTime + 5, duration)]
    };

    const newChunks = [...transcriptionResult.chunks];
    newChunks.splice(index + 1, 0, newChunk);

    setTranscriptionResult({
      ...transcriptionResult,
      chunks: newChunks
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      const clampedWidth = Math.max(20, Math.min(80, newLeftWidth));
      setLeftPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const generateLRC = () => {
    if (!transcriptionResult?.chunks) return '';

    let lrcContent = '';
    lrcContent += '[ti:Generated by Lyric Syncer]\n';
    lrcContent += '[ar:Unknown Artist]\n';
    lrcContent += '[al:Unknown Album]\n';
    lrcContent += '[by:OpenAI Whisper-X]\n\n';

    transcriptionResult.chunks.forEach((chunk: LyricChunk) => {
      const minutes = Math.floor(chunk.timestamp[0] / 60);
      const seconds = (chunk.timestamp[0] % 60).toFixed(2);
      const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.padStart(5, '0')}]`;
      const text = typeof chunk.text === 'string' ? chunk.text.trim() : String(chunk.text || '');
      if (text) {
        lrcContent += `${timestamp}${text}\n`;
      }
    });

    return lrcContent;
  };

  const downloadLRC = () => {
    const lrcContent = generateLRC();
    const blob = new Blob([lrcContent], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name.replace(/\.[^/.]+$/, '') || 'lyrics'}.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getProcessingStatusText = () => {
    if (processingProgress < 20) return "Initializing Whisper-X model...";
    if (processingProgress < 40) return "Converting audio format...";
    if (processingProgress < 70) return "Transcribing with AI...";
    if (processingProgress < 90) return "Aligning timestamps...";
    return "Finalizing results...";
  };

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'bg-background' : 'bg-background'}`}>

      {/* Background Ambience */}
      {darkMode && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px] animate-pulse animation-delay-2000" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary/10 rounded-full blur-[150px] animate-pulse animation-delay-4000" />
          <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse" />
        </div>
      )}

      {/* Main Container */}
      <div
        ref={containerRef}
        className="flex h-screen items-stretch overflow-hidden relative z-10 transition-colors duration-700 bg-background"
      >
        {/* Subtle Gradient Overlay for Light Mode */}
        {!darkMode && (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50/50 via-transparent to-cyan-50/30 pointer-events-none" />
        )}

        {/* Left Sidebar */}
        <div
          className="flex flex-col min-w-[300px] z-20 group/panel bg-muted/10 border-r border-white/5 relative"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Top Status Bar integrated into sidebar - Removed as per user request to avoid duplicate status bars */}
          <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">

            <div className="p-6 space-y-8">
              <InfoPanel showInfo={showInfo} setShowInfo={setShowInfo} />

              <FileUploadPanel
                audioFile={audioFile}
                isProcessing={isProcessing}
                processingProgress={processingProgress}
                transcriptionResult={transcriptionResult}
                handleFileUpload={handleFileUpload}
                processAudio={processAudio}
                fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
                getProcessingStatusText={getProcessingStatusText}
              />
            </div>

            {audioUrl && (
              <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-white/10 z-30">
                <AudioPlayerPanel
                  audioUrl={audioUrl}
                  audioRef={audioRef as React.RefObject<HTMLAudioElement>}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  handlePlayPause={handlePlayPause}
                  handleTimeUpdate={handleTimeUpdate}
                  handleLoadedMetadata={handleLoadedMetadata}
                  handleProgressClick={handleProgressClick}
                  skipBackward={skipBackward}
                  skipForward={skipForward}
                  downloadLRC={downloadLRC}
                  transcriptionResult={transcriptionResult}
                  formatTime={formatTime}
                  playbackRate={playbackRate}
                  setPlaybackRate={setPlaybackRate}
                  abLoop={abLoop}
                  setAbLoop={setAbLoop}
                />
              </div>
            )}
          </div>
        </div>

        {/* Resizer Handle */}
        <div
          className="w-1 relative z-50 cursor-col-resize flex items-center justify-center group/resizer hover:bg-primary/50 transition-colors delay-75"
          onMouseDown={handleMouseDown}
        >
          <div className={`absolute w-4 h-full z-10`} /> {/* Hit area */}
          <div className={`h-full w-[1px] bg-white/10 group-hover/resizer:bg-primary transition-colors ${isDragging ? 'bg-primary' : ''}`} />
        </div>

        {/* Right Content Area */}
        <div
          className="flex-1 min-w-0 flex flex-col bg-background/40 relative z-0"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Synchronized Lyrics</h2>
                {transcriptionResult && (
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    {transcriptionResult.chunks.length} lines
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Backend Status Indicator */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${backendStatus === 'ok'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : backendStatus === 'checking'
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}
                title={backendStatus === 'ok' ? "Backend Online" : backendStatus === 'checking' ? "Checking connection..." : "Backend Offline - Click to Retry"}
                onClick={checkBackendHealth}
                style={{ cursor: 'pointer' }}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'ok' ? 'bg-green-500 animate-pulse' : backendStatus === 'checking' ? 'bg-yellow-500 animate-bounce' : 'bg-red-500'}`} />
                {backendStatus === 'ok' ? 'Online' : backendStatus === 'checking' ? 'Checking...' : 'Offline'}
              </div>

              {transcriptionResult && (
                <Button
                  variant={isEditMode ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="h-8 shadow-none font-medium"
                >
                  <Edit3 className="h-3.5 w-3.5 mr-2" />
                  {isEditMode ? "Done" : "Edit"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setDarkMode((d) => !d)}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <LyricsPanel
              transcriptionResult={transcriptionResult}
              activeChunkIndex={activeChunkIndex}
              manuallySelectedChunk={manuallySelectedChunk}
              isEditMode={isEditMode}
              editingIndex={editingIndex}
              editText={editText}
              editStartTime={editStartTime}
              editEndTime={editEndTime}
              setEditText={setEditText}
              setEditStartTime={setEditStartTime}
              setEditEndTime={setEditEndTime}
              startEditing={startEditing}
              saveEdit={saveEdit}
              cancelEdit={cancelEdit}
              deleteChunk={deleteChunk}
              addChunk={addChunk}
              handleLyricClick={handleLyricClick}
              lyricsContainerRef={lyricsContainerRef as React.RefObject<HTMLDivElement>}
              formatTime={formatTime}
              currentTime={currentTime}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;