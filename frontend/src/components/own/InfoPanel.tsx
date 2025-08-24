import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Zap, Globe, Clock } from "lucide-react";

interface InfoPanelProps {
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ showInfo, setShowInfo }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Info className="h-6 w-6 text-primary" />
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
);

export default InfoPanel;
