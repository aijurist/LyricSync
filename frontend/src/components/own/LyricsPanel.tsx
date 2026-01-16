import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit3, X, Plus, Save, Clock, Info, Languages, Music2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { LyricChunk, Word } from "../../types";

export interface LyricsPanelProps {
  transcriptionResult: { chunks: LyricChunk[] } | null;
  activeChunkIndex: number;
  manuallySelectedChunk: number;
  isEditMode: boolean;
  editingIndex: number | null;
  editText: string;
  editStartTime: string;
  editEndTime: string;
  setEditText: (text: string) => void;
  setEditStartTime: (text: string) => void;
  setEditEndTime: (text: string) => void;
  startEditing: (index: number) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  deleteChunk: (index: number) => void;
  addChunk: (index: number) => void;
  handleLyricClick: (chunk: LyricChunk, index: number) => void;
  lyricsContainerRef: React.RefObject<HTMLDivElement>;
  formatTime: (seconds: number) => string;
  currentTime?: number;
}

const LyricsPanel: React.FC<LyricsPanelProps> = ({
  transcriptionResult,
  activeChunkIndex,
  manuallySelectedChunk,
  isEditMode,
  editingIndex,
  editText,
  editStartTime,
  editEndTime,
  setEditText,
  setEditStartTime,
  setEditEndTime,
  startEditing,
  saveEdit,
  cancelEdit,
  deleteChunk,
  addChunk,
  handleLyricClick,
  lyricsContainerRef,
  formatTime,
  currentTime = 0,
}) => {
  const [translations, setTranslations] = React.useState<Record<number, string>>({});
  const [translating, setTranslating] = React.useState<number | null>(null);

  const translateLine = async (chunk: LyricChunk, index: number) => {
    setTranslating(index);
    try {
      const response = await fetch(`http://localhost:8000/ai/translate?text=${encodeURIComponent(chunk.text)}&target_lang=en`, {
        method: 'POST',
      });
      const data = await response.json();
      setTranslations({ ...translations, [index]: data.translated_text });
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslating(null);
    }
  };



  return (
    <div className="flex-1 overflow-hidden h-full flex flex-col">
      {transcriptionResult ? (
        <div className="flex-1 flex flex-col h-full">
          <div className="flex items-center gap-2 px-6 py-2 bg-muted/20 border-b border-black/5 dark:border-white/5">
            <Info className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">
              {isEditMode
                ? editingIndex !== null
                  ? `Editing line ${editingIndex + 1} of ${transcriptionResult.chunks.length}`
                  : `Edit mode unlocked. Poke a line to fix it.`
                : `Click any line to warp space-time (jump to timestamp).`}
            </span>
          </div>

          <div
            ref={lyricsContainerRef}
            className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
          >
            <div className="space-y-6 max-w-4xl mx-auto pb-[50vh]">
              {transcriptionResult.chunks.map((chunk: LyricChunk, index: number) => {
                const isActive = index === activeChunkIndex || index === manuallySelectedChunk;
                // Determine if this chunk is "near" the active one for focus mode fading
                const isNear = Math.abs(index - activeChunkIndex) <= 2;
                const opacityClass = isActive ? 'opacity-100 scale-100' : isNear ? 'opacity-70 scale-95 blur-[0.5px]' : 'opacity-40 scale-95 blur-[1px]';

                return (
                  <div
                    id={`lyric-chunk-${index}`}
                    key={index}
                    className={`group relative p-6 rounded-2xl transition-all duration-700 ease-out border border-transparent ${isActive
                      ? 'z-10'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/5 dark:hover:border-white/5'
                      } ${opacityClass}`}
                    onClick={() => !isEditMode && handleLyricClick(chunk, index)}
                  >
                    {/* Line Number & Time */}
                    <div className="flex items-center justify-between mb-3 opacity-80">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded-full ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
                          }`}>
                          #{String(index + 1).padStart(2, '0')}
                        </span>
                        {editingIndex === index && (
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Fixing Typo
                          </span>
                        )}
                      </div>

                      <div className={`flex items-center gap-1.5 text-[11px] font-mono transition-colors ${isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                        }`}>
                        <Clock className="h-3 w-3" />
                        {formatTime(chunk.timestamp[0])}
                      </div>
                    </div>

                    {editingIndex === index ? (
                      <div className="space-y-4 bg-white/60 dark:bg-black/20 p-4 rounded-xl border border-black/10 dark:border-white/10 backdrop-blur-md">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[100px] resize-none text-xl font-medium bg-transparent border-black/10 dark:border-white/10 focus:border-primary/50 transition-all text-foreground"
                          placeholder="Enter lyric text..."
                          autoFocus
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block tracking-wider">Start Time</label>
                            <Input
                              value={editStartTime}
                              onChange={(e) => setEditStartTime(e.target.value)}
                              className="h-9 font-mono text-sm bg-black/5 dark:bg-black/20 border-black/10 dark:border-white/10"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block tracking-wider">End Time</label>
                            <Input
                              value={editEndTime}
                              onChange={(e) => setEditEndTime(e.target.value)}
                              className="h-9 font-mono text-sm bg-black/5 dark:bg-black/20 border-black/10 dark:border-white/10"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button size="sm" onClick={saveEdit} className="flex-1 h-9 font-semibold">
                            <Save className="h-4 w-4 mr-2" />
                            Lock It In
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1 h-9 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">
                            <X className="h-4 w-4 mr-2" />
                            Nah, Nevermind
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative pl-2">
                        {/* Lyric Text */}
                        <div className={`text-2xl md:text-3xl leading-snug font-sans tracking-tight transition-colors duration-300 ${isActive
                          ? 'font-bold text-foreground'
                          : 'text-muted-foreground/40 font-medium group-hover:text-foreground/80'
                          }`}>
                          {chunk.words && chunk.words.length > 0 ? (
                            <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                              {chunk.words.map((word: Word, wordIndex: number) => {
                                // Determine word state
                                const isPast = currentTime > word.timestamp[1];
                                const isCurrent = currentTime >= word.timestamp[0] && currentTime <= word.timestamp[1];

                                return (
                                  <span
                                    key={wordIndex}
                                    className={`relative px-0.5 rounded-sm transition-colors duration-200 ${isActive
                                      ? isCurrent
                                        ? 'text-foreground scale-100 font-bold' // Current word: bold and primary color
                                        : isPast
                                          ? 'text-foreground/90'      // Past words: Highly visible
                                          : 'text-foreground/30'      // Future words: Dimmed
                                      : ''
                                      }`}
                                  >
                                    {word.word}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p>
                              {typeof chunk.text === 'string' ? chunk.text.trim() : String(chunk.text || '')}
                            </p>
                          )}
                        </div>

                        {/* Translation */}
                        {translations[index] && (
                          <div className="mt-4 pl-4 border-l-2 border-primary/50 text-base text-foreground/80 italic font-light animate-in slide-in-from-left-2 fade-in">
                            {translations[index]}
                          </div>
                        )}

                        {/* Actions Overlay */}
                        <div className={`absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 transition-all duration-300 ${isActive || isEditMode ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
                          }`}>
                          {!isEditMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                translateLine(chunk, index);
                              }}
                              disabled={translating === index}
                              className="h-8 px-2 text-xs hover:bg-primary/20 hover:text-primary rounded-full glass-button"
                            >
                              <Languages className="h-4 w-4" />
                            </Button>
                          )}

                          {isEditMode && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(index)}
                                className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary rounded-full"
                                title="Edit line"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addChunk(index)}
                                className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary rounded-full"
                                title="Insert line below"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteChunk(index)}
                                className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive rounded-full"
                                title="Delete line"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/5">
          <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Music2 className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <div className="max-w-md space-y-3">
            <h3 className="text-xl font-semibold text-foreground">
              Absolute Silence
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              It’s quiet... too quiet. Upload a file to get this party started (or at least synchronized).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricsPanel;
