import React from 'react';
import { Card } from "@/components/ui/card";
import { Activity, CheckCircle, Clock } from "lucide-react";

interface TopStatusBarProps {
  isProcessing: boolean;
  processingProgress: number;
  processingStatus: string;
  audioFile: string | null;
  duration: string;
  version?: string;
}

const TopStatusBar: React.FC<TopStatusBarProps> = ({
  isProcessing,
  processingProgress,
  processingStatus,
  audioFile,
  duration,
  version = "v1.0.0"
}) => {
  const getStatusIcon = () => {
    if (isProcessing) {
      return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (audioFile) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isProcessing) {
      return "Processing...";
    }
    if (audioFile) {
      return "Ready";
    }
    return "Ready to process";
  };

  const getStatusColor = () => {
    if (isProcessing) {
      return "text-blue-600 dark:text-blue-400";
    }
    if (audioFile) {
      return "text-green-600 dark:text-green-400";
    }
    return "text-muted-foreground";
  };

  return (
    <div className="w-full mb-4">
      <Card className="p-3 bg-background/80 backdrop-blur-sm border-border/50 shadow-sm dark:bg-black/40 dark:border-slate-800/60 dark:shadow-xl">
        <div className="flex items-center justify-between">
          {/* Left side - Status and Progress */}
          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>

            {/* Audio File Info */}
            {audioFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{audioFile}</span>
                {duration && (
                  <>
                    <span>•</span>
                    <span>{duration}</span>
                  </>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {isProcessing && (
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground min-w-[3rem]">
                  {Math.round(processingProgress)}%
                </span>
              </div>
            )}
          </div>

          {/* Right side - Version and Status Details */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">{version}</span>
            {isProcessing && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>{processingStatus}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TopStatusBar;
