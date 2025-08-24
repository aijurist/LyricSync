import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Zap, Globe, Clock } from "lucide-react";
import ElectricBorder from "@/components/ui/ElectricBorder";

interface InfoPanelProps {
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
  darkMode: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ showInfo, setShowInfo, darkMode }) => (
  <div className="mb-8">
    <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-sm dark:from-primary/30 dark:to-primary/20 dark:shadow-lg">
        <Info className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Lyric Syncer
        </h1>
        <p className="text-base text-muted-foreground mt-1 font-medium">
          AI-powered lyric synchronization
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setShowInfo(!showInfo)}
        className="text-sm font-medium hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
      >
        <Info className="h-4 w-4 mr-2" />
        How it works
      </Button>
    </div>
    {showInfo && (
      <div className="mt-4">
        {darkMode ? (
          <ElectricBorder
            color="#00ffff"
            speed={1.5}
            chaos={1.2}
            thickness={8}
            style={{ borderRadius: 16, padding: '2px' }}
          >
                         <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm shadow-2xl dark:from-primary/20 dark:to-primary/10 dark:shadow-2xl">
               <CardContent className="p-6 space-y-4">
                 <div className="flex items-start gap-3">
                   <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                     <Zap className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-semibold text-primary text-base">OpenAI Whisper-X Model</p>
                     <p className="text-muted-foreground text-sm leading-relaxed">Advanced speech-to-text with precise timestamp alignment</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                     <Globe className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-semibold text-primary text-base">Hugging Face Inference</p>
                     <p className="text-muted-foreground text-sm leading-relaxed">Powered by HF's inference endpoints for reliable processing</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                     <Clock className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-semibold text-primary text-base">Word-Level Alignment</p>
                     <p className="text-muted-foreground text-sm leading-relaxed">Generates precise timestamps for each lyric segment</p>
                   </div>
                 </div>
                 <div className="pt-4 border-t border-primary/20">
                   <p className="text-sm text-muted-foreground font-medium">
                     Supports: MP3, WAV, M4A, FLAC • Max: 25MB • Languages: 100+
                   </p>
                 </div>
               </CardContent>
             </Card>
          </ElectricBorder>
        ) : (
                     <Card className="mt-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl dark:border-slate-700/50 dark:from-black/40 dark:to-slate-900/30 dark:shadow-2xl">
             <CardContent className="p-6 space-y-4">
               <div className="flex items-start gap-3">
                 <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                   <Zap className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                   <p className="font-semibold text-primary text-base">OpenAI Whisper-X Model</p>
                   <p className="text-muted-foreground text-sm leading-relaxed">Advanced speech-to-text with precise timestamp alignment</p>
                 </div>
               </div>
               <div className="flex items-start gap-3">
                 <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                   <Globe className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                   <p className="font-semibold text-primary text-base">Hugging Face Inference</p>
                   <p className="text-muted-foreground text-sm leading-relaxed">Powered by HF's inference endpoints for reliable processing</p>
                 </div>
               </div>
               <div className="flex items-start gap-3">
                 <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                   <Clock className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                   <p className="font-semibold text-primary text-base">Word-Level Alignment</p>
                   <p className="text-muted-foreground text-sm leading-relaxed">Generates precise timestamps for each lyric segment</p>
                 </div>
               </div>
               <div className="pt-4 border-t border-primary/20">
                 <p className="text-sm text-muted-foreground font-medium">
                   Supports: MP3, WAV, M4A, FLAC • Max: 25MB • Languages: 100+
                 </p>
               </div>
             </CardContent>
           </Card>
        )}
      </div>
    )}
  </div>
);

export default InfoPanel;
