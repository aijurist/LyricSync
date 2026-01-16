import type { TranscriptionResult } from "../../types";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Zap, Music, FileAudio } from "lucide-react";

interface FileUploadPanelProps {
  audioFile: File | null;
  isProcessing: boolean;
  transcriptionResult: TranscriptionResult | null;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  processAudio: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  getProcessingStatusText: () => string;
}

const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  audioFile,
  isProcessing,
  transcriptionResult,
  handleFileUpload,
  processAudio,
  fileInputRef,
  getProcessingStatusText
}) => (
  <Card className="mb-6 border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 backdrop-blur-md overflow-hidden transition-all duration-300 rounded-3xl">
    <CardHeader className="pb-4 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5">
      <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2 text-foreground/90">
        <Music className="h-4 w-4 text-primary" />
        SOURCE AUDIO
      </CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      <Input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {!audioFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/20 hover:border-primary/50 bg-white/40 dark:bg-white/5 hover:bg-primary/5 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-white/40 dark:bg-white/5 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <Download className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Drop that fire track here</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-wider">MP3, WAV, M4A (We accept bangers only)</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="p-2.5 bg-primary/20 rounded-lg shrink-0">
              <FileAudio className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-foreground truncate pr-2" title={audioFile.name}>
                  {audioFile.name}
                </p>
                <Badge variant="secondary" className="text-[10px] px-2 h-5 bg-black/5 dark:bg-white/10 text-foreground hover:bg-black/10 dark:hover:bg-white/20 border-transparent">
                  {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {audioFile.type.split('/')[1] || 'AUDIO'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-full"
            >
              Change
            </Button>
          </div>

          {isProcessing ? (
            <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 animate-pulse" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="w-3 h-3 bg-primary rounded-full animate-ping absolute inset-0 opacity-75" />
                  <div className="w-3 h-3 bg-primary rounded-full relative" />
                </div>
                <span className="text-sm font-bold text-primary tracking-wide">
                  {getProcessingStatusText()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground pl-6 relative z-10">
                This may take a minute depending on the file length...
              </p>
            </div>
          ) : (
            !transcriptionResult && (
              <Button
                onClick={processAudio}
                className="w-full h-12 transition-all bg-primary text-primary-foreground font-bold tracking-wide text-sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                GENERATE SYNCED LYRICS
              </Button>
            )
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export default FileUploadPanel;
