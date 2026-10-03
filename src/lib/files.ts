const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|flac|ogg|opus|webm|aac|mp4)$/i;
const LYRIC_EXTENSIONS = /\.(lrc|srt|vtt|json)$/i;

export const isAudioFile = (file: File) => file.type.startsWith('audio/') || AUDIO_EXTENSIONS.test(file.name);
export const isLyricsFile = (file: File) => LYRIC_EXTENSIONS.test(file.name);
export const baseName = (filename: string) => filename.replace(/\.[^/.]+$/, '');
