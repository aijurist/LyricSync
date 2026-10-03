import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, Cpu, Clock, Download } from 'lucide-react';

const FEATURES = [
  { icon: ShieldCheck, title: '100% on-device', text: 'Your audio is decoded and transcribed in this browser tab. Nothing is uploaded.' },
  { icon: Cpu, title: 'Whisper on WebGPU', text: 'Runs on your GPU when available, otherwise on the CPU via WebAssembly. Models are cached after the first download, so it works offline after that.' },
  { icon: Clock, title: 'Word-level timing', text: 'Every word is timestamped for karaoke-style playback and enhanced LRC.' },
  { icon: Download, title: 'Edit & export', text: 'Fix lines, nudge timing, then export LRC, SRT, VTT, text or JSON. Edits autosave locally.' },
];

const InfoPanel: React.FC = () => (
  <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
    <CardContent className="p-4 space-y-4">
      {FEATURES.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex gap-3">
          <div className="p-2 bg-primary/10 rounded-lg h-fit">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{text}</p>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export default InfoPanel;
