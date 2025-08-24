import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit3, X, Plus, Save, Clock, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { LyricChunk } from "../../types";

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
}) => (
  <div className="flex-1 overflow-hidden">
    {transcriptionResult ? (
      <div>
        {/* Progress bar for current lyric position */}
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 ml-4 mt-3 text-primary" />
          <span className="text-xs mt-3 text-muted-foreground">
            {isEditMode
              ? editingIndex !== null
                ? `Editing line ${editingIndex + 1} of ${transcriptionResult.chunks.length}`
                : `Edit mode: Click the pencil icon to edit a line.`
              : `Click a lyric line to jump to that moment.`}
          </span>
        </div>
        <div
          ref={lyricsContainerRef}
          className="h-full overflow-y-auto px-4 py-4 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="space-y-2 max-w-none">
            {transcriptionResult.chunks.map((chunk: LyricChunk, index: number) => (
              <div
                id={`lyric-chunk-${index}`}
                key={index}
                className={`py-3 px-4 rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-[1.01] ${
                  index === activeChunkIndex || index === manuallySelectedChunk
                    ? 'bg-gradient-to-r from-primary/15 to-primary/10 text-primary shadow-md border border-primary/30 scale-[1.02]'
                    : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:shadow-sm'
                }`}
                onClick={() => !isEditMode && handleLyricClick(chunk, index)}
              >
                {/* Show chunk index and total */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground/70">#{index + 1}</span>
                  {editingIndex === index && (
                    <span className="text-xs text-primary font-semibold">Editing</span>
                  )}
                </div>
                {editingIndex === index ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px] resize-none"
                      placeholder="Enter lyric text..."
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Start Time</label>
                        <Input
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          placeholder="0:00"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">End Time</label>
                        <Input
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          placeholder="0:00"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} className="flex-1">
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1">
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <p className={`leading-relaxed transition-all flex-1 ${
                        index === activeChunkIndex || index === manuallySelectedChunk
                          ? 'text-base font-medium' 
                          : 'text-sm hover:font-medium'
                      }`}>
                        {typeof chunk.text === 'string' ? chunk.text.trim() : String(chunk.text || '')}
                      </p>
                      {isEditMode && (
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(index)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteChunk(index)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addChunk(index)}
                            className="h-6 w-6 p-0 text-primary"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className={`text-xs mt-1 font-mono flex items-center gap-2 ${
                      index === activeChunkIndex || index === manuallySelectedChunk
                        ? 'text-primary/80' 
                        : 'text-muted-foreground/70'
                    }`}>
                      <Clock className="h-3 w-3" />
                      {formatTime(chunk.timestamp[0])} - {formatTime(chunk.timestamp[1])}
                      <span className="text-muted-foreground/50">
                        ({(chunk.timestamp[1] - chunk.timestamp[0]).toFixed(1)}s)
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div className="h-16"></div> {/* Bottom spacing for better UX */}
          </div>
        </div>
      </div>
    ) : (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div className="max-w-md">
          <div className="text-6xl mb-6 opacity-30">🎵</div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              {!isEditMode
                ? "Ready to sync your lyrics"
                : "Edit mode: Click the pencil icon to edit a line."}
            </p>
            <p className="text-sm text-muted-foreground">
              {!isEditMode
                ? "Upload an audio file to get started with AI-powered lyric synchronization"
                : "You can edit, add, or delete lyric lines and adjust their timestamps."}
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default LyricsPanel;
