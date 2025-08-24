import { Sun, Moon } from "lucide-react";
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Edit3 } from "lucide-react";
import InfoPanel from "@/components/own/InfoPanel";
import FileUploadPanel from "@/components/own/FileUploadPanel";
import AudioPlayerPanel from "@/components/own/AudioPlayerPanel";
import LyricsPanel from "@/components/own/LyricsPanel";
import type { LyricChunk, TranscriptionResult } from "./types";

function App() {
  // ...existing code...
  // const [helpOpen, setHelpOpen] = useState(false); // Help modal removed
  // Dark mode state
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
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  // Advanced audio controls
  const [playbackRate, setPlaybackRate] = useState(1);
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    
    // Simulate realistic processing progress
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 10 + 5;
      });
    }, 300);

    const formData = new FormData();
    formData.append('audio', audioFile);

    try {
      const response = await fetch('http://localhost:8000/ai/test/stt/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.result && typeof data.result === 'object') {
        setTranscriptionResult(data.result);
      } else {
        console.error('Unexpected response format:', data);
        throw new Error('Received unexpected response format from server');
      }
      setProcessingProgress(100);
    } catch (error) {
      console.error('Error processing audio:', error);
      alert(`Error processing audio: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the backend server is running on localhost:8000.`);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 800);
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

  // Keep playbackRate in sync with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // A/B Looping: if enabled, keep audio in loop
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
    // Set manually selected chunk immediately
    setManuallySelectedChunk(index);
    setActiveChunkIndex(index);
    
    // Seek to the exact start time of the clicked chunk
    const seekTime = chunk.timestamp[0];
    handleSeek(seekTime);
    
    // Scroll the clicked line into view
    setTimeout(() => {
      const element = document.getElementById(`lyric-chunk-${index}`);
      if (element && lyricsContainerRef.current) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);
    
    // Clear manual selection after a short delay to allow natural playback highlighting
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

  // Update active chunk based on current time - fixed logic
  useEffect(() => {
    if (transcriptionResult?.chunks && manuallySelectedChunk === -1) {
      let activeIndex = -1;
      
      // Find the chunk that best matches the current time
      for (let i = 0; i < transcriptionResult.chunks.length; i++) {
        const chunk = transcriptionResult.chunks[i];
        const startTime = chunk.timestamp[0];
        const endTime = chunk.timestamp[1];
        
        // Current time is within this chunk's timespan
        if (currentTime >= startTime && currentTime <= endTime) {
          activeIndex = i;
          break;
        }
        // Current time is past this chunk but before the next one
        else if (currentTime >= startTime) {
          const nextChunk = transcriptionResult.chunks[i + 1];
          if (!nextChunk || currentTime < nextChunk.timestamp[0]) {
            activeIndex = i;
          }
        }
      }
      
      if (activeIndex !== activeChunkIndex) {
        setActiveChunkIndex(activeIndex);
        
        // Auto-scroll to active chunk
        if (activeIndex >= 0) {
          setTimeout(() => {
            const element = document.getElementById(`lyric-chunk-${activeIndex}`);
            if (element && lyricsContainerRef.current) {
              element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
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

  // Add mouse event listeners
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain between 20% and 80%
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 transition-colors duration-300">
  {/* Help button and modal removed */}
      <button
        className="fixed top-4 right-4 z-50 bg-background dark:bg-muted border border-border rounded-full w-10 h-10 flex items-center justify-center shadow hover:bg-primary/10 transition-colors"
        onClick={() => setDarkMode((d) => !d)}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle dark mode"
      >
        {darkMode ? (
          <Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          <Moon className="h-5 w-5 text-primary" />
        )}
      </button>
      <div ref={containerRef} className="flex h-screen relative">
        {/* Left Panel - Controls */}
        <div 
          className="flex flex-col p-6 min-w-0" 
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Header / Info Panel */}
          <InfoPanel showInfo={showInfo} setShowInfo={setShowInfo} />

          {/* File Upload Panel */}
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

          {/* Audio Player Panel */}
          {audioUrl && (
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
          )}
        </div>

        {/* Resize Handle */}
        <div
          className={`w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors relative group ${
            isDragging ? 'bg-primary' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/10" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-muted-foreground/20 rounded-full group-hover:bg-primary/50 transition-colors" />
        </div>

        {/* Right Panel - Lyrics */}
        <div 
          className="border-l border-border bg-muted/10 min-w-0" 
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border bg-background/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-1 bg-primary/10 rounded">
                    <Mic className="h-4 w-4 text-primary" />
                  </div>
                  Synchronized Lyrics
                </h2>
                {transcriptionResult && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isEditMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsEditMode(!isEditMode)}
                      className="h-8"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      {isEditMode ? "Exit Edit" : "Edit Mode"}
                    </Button>
                  </div>
                )}
              </div>
              {transcriptionResult && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Click any line to jump to that moment • {transcriptionResult.chunks.length} segments
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>• Auto-scroll enabled</span>
                    <span>• Word-level timing</span>
                    <span>• Export as LRC</span>
                    {isEditMode && <span className="text-primary">• Edit mode active</span>}
                  </div>
                </div>
              )}
            </div>
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;