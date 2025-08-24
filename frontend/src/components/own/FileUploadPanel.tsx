import type { TranscriptionResult } from "../../types";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Zap } from "lucide-react";

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
  <Card className="mb-4 shadow-sm dark:shadow-xl dark:bg-black/40 dark:border-slate-800/60 dark:backdrop-blur-sm">
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
              <div className="flex items-center gap-2 text-sm text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="font-medium">{getProcessingStatusText()}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Processing in progress... Check the top status bar for details.
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
);

export default FileUploadPanel;
