import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, SkipBack, SkipForward, Download, Info, Mic, Zap, Clock, Globe, Edit3, Save, X, Plus } from "lucide-react";

interface LyricChunk {
  text: string;
  timestamp: [number, number];
}

interface TranscriptionResult {
  text: string;
  chunks: LyricChunk[];
}

function App() {
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div ref={containerRef} className="flex h-screen relative">
        {/* Left Panel - Controls */}
        <div 
          className="flex flex-col p-6 min-w-0" 
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Lyric Syncer</h1>
                <p className="text-sm text-muted-foreground">AI-powered lyric synchronization</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowInfo(!showInfo)}
                className="text-xs"
              >
                <Info className="h-3 w-3 mr-1" />
                How it works
              </Button>
            </div>

            {showInfo && (
              <Card className="mt-4 border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm space-y-3">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-primary">OpenAI Whisper-X Model</p>
                      <p className="text-muted-foreground">Advanced speech-to-text with precise timestamp alignment</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Globe className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-primary">Hugging Face Inference</p>
                      <p className="text-muted-foreground">Powered by HF's inference endpoints for reliable processing</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-primary">Word-Level Alignment</p>
                      <p className="text-muted-foreground">Generates precise timestamps for each lyric segment</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      Supports: MP3, WAV, M4A, FLAC • Max: 25MB • Languages: 100+
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* File Upload */}
          <Card className="mb-4 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1 bg-primary/10 rounded">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                Upload Audio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full h-10 border-2 border-dashed hover:border-primary/50 hover:bg-primary/5"
              >
                <Download className="h-4 w-4 mr-2" />
                Choose Audio File
              </Button>
              
              {audioFile && (
                <div className="mt-3">
                  <Badge variant="secondary" className="mb-2 max-w-full truncate">
                    {audioFile.name}
                  </Badge>
                  <div className="text-xs text-muted-foreground mb-3">
                    Size: {(audioFile.size / 1024 / 1024).toFixed(1)} MB • 
                    Type: {audioFile.type}
                  </div>
                  
                  {isProcessing ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-primary font-medium">{getProcessingStatusText()}</span>
                        <span className="font-mono">{Math.round(processingProgress)}%</span>
                      </div>
                      <Progress value={processingProgress} className="w-full h-2" />
                      <p className="text-xs text-muted-foreground">
                        This may take 30-60 seconds depending on audio length...
                      </p>
                    </div>
                  ) : (
                    !transcriptionResult && (
                      <Button 
                        onClick={processAudio}
                        className="w-full h-10 bg-primary hover:bg-primary/90"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Sync Lyrics with AI
                      </Button>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audio Player */}
          {audioUrl && (
            <Card className="mb-4 flex-1 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1 bg-primary/10 rounded">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  Audio Player
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="hidden"
                />
                
                {/* Progress Bar */}
                <div className="mb-4">
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
                <div className="flex justify-center items-center gap-4">
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
            
            <div className="flex-1 overflow-hidden">
              {transcriptionResult ? (
                <div 
                  ref={lyricsContainerRef}
                  className="h-full overflow-y-auto px-4 py-4 scroll-smooth"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  <div className="space-y-2 max-w-none">
                    {transcriptionResult.chunks.map((chunk: LyricChunk, index: number) => (
                      <div
                        id={`lyric-chunk-${index}`}
                        key={index}
                        className={`py-3 px-4 rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-[1.01] ${
                          index === activeChunkIndex || index === manuallySelectedChunk
                            ? 'bg-gradient-to-r from-primary/15 to-primary/10 text-primary shadow-md border border-primary/30 scale-[1.02]'
                            : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:shadow-sm'
                        }`}
                        onClick={() => !isEditMode && handleLyricClick(chunk, index)}
                      >
                        {editingIndex === index ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-[60px] resize-none"
                              placeholder="Enter lyric text..."
                            />
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">Start Time</label>
                                <Input
                                  value={editStartTime}
                                  onChange={(e) => setEditStartTime(e.target.value)}
                                  placeholder="0:00"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">End Time</label>
                                <Input
                                  value={editEndTime}
                                  onChange={(e) => setEditEndTime(e.target.value)}
                                  placeholder="0:00"
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEdit} className="flex-1">
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1">
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <p className={`leading-relaxed transition-all flex-1 ${
                                index === activeChunkIndex || index === manuallySelectedChunk
                                  ? 'text-base font-medium' 
                                  : 'text-sm hover:font-medium'
                              }`}>
                                {typeof chunk.text === 'string' ? chunk.text.trim() : String(chunk.text || '')}
                              </p>
                              {isEditMode && (
                                <div className="flex items-center gap-1 ml-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(index)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteChunk(index)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => addChunk(index)}
                                    className="h-6 w-6 p-0 text-primary"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className={`text-xs mt-1 font-mono flex items-center gap-2 ${
                              index === activeChunkIndex || index === manuallySelectedChunk
                                ? 'text-primary/80' 
                                : 'text-muted-foreground/70'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {formatTime(chunk.timestamp[0])} - {formatTime(chunk.timestamp[1])}
                              <span className="text-muted-foreground/50">
                                ({(chunk.timestamp[1] - chunk.timestamp[0]).toFixed(1)}s)
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    <div className="h-16"></div> {/* Bottom spacing for better UX */}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div className="max-w-md">
                    <div className="text-6xl mb-6 opacity-30">🎵</div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-foreground">
                        {!audioFile ? 
                          "Ready to sync your lyrics" : 
                          isProcessing ? 
                            "AI is processing your audio..." : 
                            "Click 'Sync Lyrics' to begin"
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {!audioFile ? 
                          "Upload an audio file to get started with AI-powered lyric synchronization" :
                          isProcessing ?
                            "Using OpenAI Whisper-X for precise transcription and alignment" :
                            "Generate time-synced lyrics that you can export as LRC files"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;