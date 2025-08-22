import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, Download } from "lucide-react";

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setTranscriptionResult(null);
    } else {
      alert('Please select a valid audio file');
    }
  };

  const processAudio = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    
    // Simulate processing progress over 10 seconds
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    const formData = new FormData();
    formData.append('audio', audioFile);

    try {
      const response = await fetch('http://localhost:8000/ai/stt/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const data = await response.json();
      
      // Handle the response format
      if (data.result && typeof data.result === 'object') {
        setTranscriptionResult(data.result);
      } else {
        // Fallback if the response format is unexpected
        console.error('Unexpected response format:', data);
        alert('Received unexpected response format from server');
      }
      setProcessingProgress(100);
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio file. Make sure the backend is running.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 500);
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
    // Seek to slightly after the start of the clicked chunk to ensure proper detection
    const seekTime = chunk.timestamp[0] + 0.1; // Add 100ms to avoid edge cases
    handleSeek(seekTime);
    // Immediately set this chunk as active
    setActiveChunkIndex(index);
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

  // Update active chunk based on current time
  useEffect(() => {
    if (transcriptionResult?.chunks) {
      // Find the chunk that contains the current time
      let activeIndex = -1;
      for (let i = 0; i < transcriptionResult.chunks.length; i++) {
        const chunk = transcriptionResult.chunks[i];
        // Use a small tolerance to handle edge cases
        const tolerance = 0.1; // 100ms tolerance
        if (currentTime >= (chunk.timestamp[0] - tolerance) && currentTime <= (chunk.timestamp[1] + tolerance)) {
          activeIndex = i;
          break;
        }
      }
      setActiveChunkIndex(activeIndex);
    }
  }, [currentTime, transcriptionResult]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateLRC = () => {
    if (!transcriptionResult?.chunks) return '';

    let lrcContent = '';
    transcriptionResult.chunks.forEach((chunk: LyricChunk) => {
      const minutes = Math.floor(chunk.timestamp[0] / 60);
      const seconds = (chunk.timestamp[0] % 60).toFixed(2);
      const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.padStart(5, '0')}]`;
      const text = typeof chunk.text === 'string' ? chunk.text.trim() : String(chunk.text || '');
      lrcContent += `${timestamp}${text}\n`;
    });

    return lrcContent;
  };

  const downloadLRC = () => {
    const lrcContent = generateLRC();
    const blob = new Blob([lrcContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name.replace(/\.[^/.]+$/, '') || 'lyrics'}.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        {/* Left Panel - Controls */}
        <div className="flex-1 flex flex-col p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Lyric Syncer</h1>
            <p className="text-muted-foreground">Upload and sync lyrics with your audio</p>
          </div>

          {/* File Upload */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Upload Audio</CardTitle>
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
                className="w-full h-12"
              >
                Choose Audio File
              </Button>
              
              {audioFile && (
                <div className="mt-4">
                  <Badge variant="secondary" className="mb-4">
                    {audioFile.name}
                  </Badge>
                  
                  {isProcessing ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Syncing lyrics...</span>
                        <span>{Math.round(processingProgress)}%</span>
                      </div>
                      <Progress value={processingProgress} className="w-full" />
                    </div>
                  ) : (
                    !transcriptionResult && (
                      <Button 
                        onClick={processAudio}
                        className="w-full h-12"
                      >
                        Sync Lyrics
                      </Button>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audio Player */}
          {audioUrl && (
            <Card className="mb-6 flex-1">
              <CardHeader>
                <CardTitle className="text-lg">Player</CardTitle>
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
                <div className="mb-6">
                  <div 
                    className="w-full h-2 bg-muted rounded-full cursor-pointer group"
                    onClick={handleProgressClick}
                  >
                    <div 
                      className="h-full bg-primary rounded-full transition-all group-hover:bg-primary/80"
                      style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
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
                    className="h-10 w-10"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    onClick={handlePlayPause}
                    size="icon"
                    className="h-12 w-12 rounded-full"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={skipForward}
                    className="h-10 w-10"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>

                {/* Download Button */}
                {transcriptionResult && (
                  <div className="mt-auto pt-6">
                    <Button 
                      onClick={downloadLRC}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download LRC
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Lyrics */}
        <div className="w-1/2 border-l border-border bg-muted/20">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Lyrics</h2>
              {transcriptionResult && (
                <p className="text-sm text-muted-foreground mt-1">
                  Click any line to jump to that moment
                </p>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden">
              {transcriptionResult ? (
                <div className="h-full overflow-y-auto px-6 py-4">
                  <div className="space-y-1">
                                         {transcriptionResult.chunks.map((chunk: LyricChunk, index: number) => (
                       <div
                         key={index}
                         className={`py-3 px-4 rounded-lg cursor-pointer transition-all duration-300 ${
                           index === activeChunkIndex
                             ? 'bg-primary/10 text-primary shadow-sm scale-[1.02] border border-primary/20'
                             : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                         }`}
                         onClick={() => handleLyricClick(chunk, index)}
                       >
                         <p className={`leading-relaxed ${
                           index === activeChunkIndex 
                             ? 'text-lg font-medium' 
                             : 'text-base'
                         }`}>
                           {typeof chunk.text === 'string' ? chunk.text.trim() : String(chunk.text || '')}
                         </p>
                         <div className={`text-xs mt-1 ${
                           index === activeChunkIndex 
                             ? 'text-primary/70' 
                             : 'text-muted-foreground/60'
                         }`}>
                           {formatTime(chunk.timestamp[0])}
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-6">
                  <div>
                    <div className="text-6xl mb-4 opacity-20">🎵</div>
                    <p className="text-muted-foreground">
                      {!audioFile ? 
                        "Upload an audio file to get started" : 
                        isProcessing ? 
                          "Processing your audio..." : 
                          "Click 'Sync Lyrics' to begin"
                      }
                    </p>
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