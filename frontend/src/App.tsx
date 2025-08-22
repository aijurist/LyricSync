import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
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
      setTranscriptionResult(null); // Clear previous results
    } else {
      alert('Please select a valid audio file');
    }
  };

  const processAudio = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
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
      
      // The backend now returns the proper format
      setTranscriptionResult(data.result);
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio file. Make sure the backend is running.');
    } finally {
      setIsProcessing(false);
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

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Update active chunk based on current time
  useEffect(() => {
    if (transcriptionResult?.chunks) {
      const activeIndex = transcriptionResult.chunks.findIndex(
        (chunk: LyricChunk) => currentTime >= chunk.timestamp[0] && currentTime <= chunk.timestamp[1]
      );
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
      lrcContent += `${timestamp}${chunk.text.trim()}\n`;
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Lyric Syncer
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upload your audio file and get synchronized lyrics with precise timestamps. 
            Perfect for creating LRC files for your music library.
          </p>
        </header>

        {/* File Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Audio File Upload</CardTitle>
            <CardDescription>
              Select an audio file to begin the transcription process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
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
                size="lg"
                className="flex-1"
              >
                Choose Audio File
              </Button>
            </div>
            
            {audioFile && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Selected File</Badge>
                  <span className="text-sm font-medium">{audioFile.name}</span>
                </div>
                
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing audio...</span>
                      <span className="text-muted-foreground">This may take a few minutes</span>
                    </div>
                    <Progress value={undefined} className="w-full" />
                  </div>
                )}
                
                <Button 
                  onClick={processAudio}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? 'Processing...' : 'Generate Lyrics'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audio Player Section */}
        {audioUrl && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Audio Player</CardTitle>
              <CardDescription>
                Control playback and monitor synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-6">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="hidden"
                />
                
                <Button
                  onClick={handlePlayPause}
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 rounded-full"
                >
                  {isPlaying ? '⏸' : '▶'}
                </Button>
                
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {audioRef.current ? formatTime(audioRef.current.duration || 0) : '00:00'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {transcriptionResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Synchronized Lyrics */}
            <Card>
              <CardHeader>
                <CardTitle>Synchronized Lyrics</CardTitle>
                <CardDescription>
                  Click any line to jump to that timestamp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {transcriptionResult.chunks.map((chunk: LyricChunk, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        index === activeChunkIndex
                          ? 'bg-primary/10 border-primary/50 shadow-sm'
                          : 'bg-muted/50 border-border hover:bg-muted'
                      }`}
                      onClick={() => handleSeek(chunk.timestamp[0])}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-xs">
                          {formatTime(chunk.timestamp[0])} - {formatTime(chunk.timestamp[1])}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{chunk.text.trim()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Full Transcript and Export */}
            <Card>
              <CardHeader>
                <CardTitle>Full Transcript</CardTitle>
                <CardDescription>
                  Complete transcription with export options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {transcriptionResult.text}
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Button 
                    onClick={downloadLRC}
                    className="w-full"
                    size="lg"
                  >
                    Download LRC File
                  </Button>
                  
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium hover:text-primary transition-colors">
                      Preview LRC Format
                    </summary>
                    <div className="mt-3 bg-muted/50 rounded-lg p-4 max-h-32 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                        {generateLRC()}
                      </pre>
                    </div>
                  </details>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        {!transcriptionResult && !isProcessing && (
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">1</Badge>
                    <span>Upload an audio file (MP3, WAV, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">2</Badge>
                    <span>Click "Generate Lyrics" to process with AI</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">3</Badge>
                    <span>Play the audio and watch lyrics sync in real-time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">4</Badge>
                    <span>Download the LRC file for your music player</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;