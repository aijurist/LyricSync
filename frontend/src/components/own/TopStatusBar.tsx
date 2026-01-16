import React from 'react';
import { Card } from "@/components/ui/card";
import { Activity, CheckCircle, Clock } from "lucide-react";

interface TopStatusBarProps {
  backendStatus: 'ok' | 'checking' | 'down';
  isProcessing: boolean;
  audioFile: File | null;
  processingProgress: number;
  processingStatus: string;
  duration: string;
  checkBackendHealth: () => void;
}

const TopStatusBar: React.FC<TopStatusBarProps> = ({
  backendStatus,
  isProcessing,
  audioFile,
  processingProgress,
  processingStatus,
  duration,
  checkBackendHealth
}) => {

  React.useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  const getStatusIcon = () => {
    if (isProcessing) {
      return <Activity className="h-3.5 w-3.5 text-primary animate-spin" />;
    }
    if (audioFile) {
      return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    }
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isProcessing) {
      return "Processing...";
    }
    if (audioFile) {
      return "Ready";
    }
    return "Idle";
  };

  const getStatusColor = () => {
    if (isProcessing) {
      return "text-primary";
    }
    if (audioFile) {
      return "text-green-500";
    }
    return "text-muted-foreground";
  };

  return (
    <div className="w-full">
      <Card className="p-4 bg-background/50 backdrop-blur-sm border-border/50 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${isProcessing ? 'bg-primary/10' : 'bg-muted'}`}>
                {getStatusIcon()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                <span className={`text-sm font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
            </div>

            {typeof backendStatus !== 'undefined' && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted/50 border border-border/50">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'ok'
                    ? 'bg-green-500'
                    : backendStatus === 'checking'
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-red-500'
                    }`}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {backendStatus === 'ok'
                    ? 'Online'
                    : backendStatus === 'checking'
                      ? 'Checking'
                      : 'Offline'}
                </span>
              </div>
            )}
          </div>

          {(audioFile || isProcessing) && (
            <div className="pt-3 border-t border-border/50 space-y-3">
              {audioFile && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[150px]" title={audioFile.name}>
                    {audioFile.name}
                  </span>
                  <span className="font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {duration}
                  </span>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-medium">{processingStatus}</span>
                    <span className="text-muted-foreground font-mono">{Math.round(processingProgress)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TopStatusBar;
