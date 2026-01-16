import type { TranscriptionResult } from "../../types";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Zap, Music, FileAudio } from "lucide-react";

interface FileUploadPanelProps {
  audioFile: File | null;
  isProcessing: boolean;
  processingProgress: number;
  transcriptionResult: TranscriptionResult | null;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  processAudio: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  getProcessingStatusText: () => string;
}

const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  audioFile,
  isProcessing,
  processingProgress,
  transcriptionResult,
  handleFileUpload,
  processAudio,
  fileInputRef,
  getProcessingStatusText
}) => (
  <div className="mb-8 w-full">
    <div className="flex items-center gap-2 mb-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">
      <Music className="h-3 w-3" />
      Source Audio
    </div>

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
        className="group relative flex flex-col items-center justify-center w-full h-32 rounded-xl border border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer overflow-hidden"
      >
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="p-3 rounded-full bg-background shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Drop track here</p>
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border relative overflow-hidden group">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <FileAudio className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" title={audioFile.name}>
              {audioFile.name}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {audioFile.type.split('/')[1] || 'AUDIO'} • {(audioFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg"
          >
            Replace
          </Button>
        </div>

        {isProcessing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-primary flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {getProcessingStatusText()}
              </span>
              <span className="text-muted-foreground">{Math.round(processingProgress)}%</span>
            </div>
            <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        ) : (
          !transcriptionResult && (
            <Button
              onClick={processAudio}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-wide text-xs rounded-lg shadow-sm hover:shadow transition-all"
            >
              <Zap className="h-3.5 w-3.5 mr-2" />
              GENERATE LYRICS
            </Button>
          )
        )}
      </div>
    )}
  </div>
);

export default FileUploadPanel;
