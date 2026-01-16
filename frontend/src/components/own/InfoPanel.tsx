import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Zap, Globe, Clock, ChevronUp } from "lucide-react";

interface InfoPanelProps {
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ showInfo, setShowInfo }) => (
  <div className="w-full">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Lyric Syncer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered synchronization
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowInfo(!showInfo)}
        className="h-8 w-8 p-0 rounded-full hover:bg-muted"
      >
        {showInfo ? <ChevronUp className="h-4 w-4" /> : <Info className="h-4 w-4" />}
      </Button>
    </div>

    {showInfo && (
      <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-4">
            <div className="flex gap-3">
              <div className="p-2 bg-primary/10 rounded-lg h-fit">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Whisper-X Model</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Advanced speech-to-text with precise timestamp alignment
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 bg-primary/10 rounded-lg h-fit">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Hugging Face Inference</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Powered by HF's inference endpoints for reliable processing
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 bg-primary/10 rounded-lg h-fit">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Word-Level Alignment</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Generates precise timestamps for each lyric segment
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-center">
              Supports MP3, WAV, M4A, FLAC • Max 25MB
            </p>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

export default InfoPanel;
