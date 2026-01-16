from fastapi import APIRouter, UploadFile, File, HTTPException, Query
import logging
import tempfile
import os
from typing import List, Dict, Any
from faster_whisper import WhisperModel
import torch
from lyric_sync.config.envs import settings

logger = logging.getLogger(__name__)

# Global model instance (initialized on first request)
_model = None
_model_lock = False

def get_whisper_model():
    """Lazy load the Whisper model to avoid startup delays."""
    global _model, _model_lock
    
    if _model is not None:
        return _model
    
    if _model_lock:
        # Wait for initialization
        import time
        for _ in range(30):  # Wait up to 30 seconds
            if _model is not None:
                return _model
            time.sleep(1)
        raise RuntimeError("Model initialization timeout")
    
    _model_lock = True
    try:
        logger.info("Initializing Whisper model (this may take a minute on first run)...")
        
        # Determine device and compute type from settings
        if settings.WHISPER_DEVICE == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            device = settings.WHISPER_DEVICE
        
        if settings.WHISPER_COMPUTE_TYPE == "auto":
            compute_type = "float16" if device == "cuda" else "int8"
        else:
            compute_type = settings.WHISPER_COMPUTE_TYPE
        
        logger.info(f"Using device: {device}, compute_type: {compute_type}")
        logger.info(f"Model: {settings.WHISPER_MODEL}")
        
        # Initialize faster-whisper model
        _model = WhisperModel(
            settings.WHISPER_MODEL,
            device=device,
            compute_type=compute_type,
            download_root=None,  # Uses default cache directory
        )
        
        logger.info("Whisper model loaded successfully!")
        return _model
    except Exception as e:
        logger.error(f"Failed to initialize Whisper model: {str(e)}")
        _model_lock = False
        raise
    finally:
        _model_lock = False
  
router = APIRouter(prefix="/ai")

def process_segments_to_chunks(segments: List[Any]) -> List[Dict[str, Any]]:
    """
    Convert faster-whisper segments to our chunk format with word-level timestamps.
    """
    chunks = []
    
    for segment in segments:
        # Extract word-level timestamps if available
        words = []
        if hasattr(segment, 'words') and segment.words:
            for word in segment.words:
                words.append({
                    "word": word.word.strip(),
                    "timestamp": [round(word.start, 2), round(word.end, 2)]
                })
        
        # Create chunk
        chunk = {
            "text": segment.text.strip(),
            "timestamp": [round(segment.start, 2), round(segment.end, 2)]
        }
        
        # Only add words if we have them
        if words:
            chunk["words"] = words
        
        chunks.append(chunk)
    
    return chunks

@router.post("/stt")
async def stt_endpoint(audio: UploadFile = File(...)):
    """
    Speech-to-text endpoint that generates lyrics with word-level timestamps.
    """
    logger.info(f"Received file: {audio.filename}, content_type: {audio.content_type}, size: {audio.size}")
    temp_file_path = None
    
    try:
        # Read audio file
        audio_bytes = await audio.read()
        file_extension = ".mp3"  # Default to mp3
        
        if audio.content_type:
            if "wav" in audio.content_type:
                file_extension = ".wav"
            elif "flac" in audio.content_type:
                file_extension = ".flac"
            elif "ogg" in audio.content_type:
                file_extension = ".ogg"
            elif "webm" in audio.content_type:
                file_extension = ".webm"
            elif "m4a" in audio.content_type:
                file_extension = ".m4a"
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        logger.info(f"Saved audio to temp file: {temp_file_path}")
        
        from fastapi.concurrency import run_in_threadpool
        
        def process_audio_sync():
            # --- Vocal Isolation Start ---
            processed_file_path = temp_file_path
            vocals_path = None
            
            try:
                from audio_separator.separator import Separator
                
                logger.info("Initializing audio separator for vocal isolation...")
                separator = Separator(
                    output_dir=os.path.dirname(temp_file_path),
                    output_single_stem="Vocals" 
                )
                # Load model (using 'Kim_Vocal_2.onnx' for faster inference on CPU)
                separator.load_model(model_filename='Kim_Vocal_2.onnx')
                
                logger.info(f"Separating vocals from: {temp_file_path}")
                output_files = separator.separate(temp_file_path)
                
                for f in output_files:
                    if "Vocals" in f:
                        vocals_path = os.path.join(os.path.dirname(temp_file_path), f)
                        processed_file_path = vocals_path
                        break
                
                if vocals_path:
                    logger.info(f"Using isolated vocals for transcription: {vocals_path}")
                else:
                    logger.warning("Could not identify vocals file, using original audio.")

            except Exception as sep_error:
                logger.error(f"Vocal separation failed (falling back to original audio): {sep_error}")
            # --- Vocal Isolation End ---

            # Get the Whisper model
            model = get_whisper_model()
            
            logger.info("Starting transcription with word-level timestamps...")
            
            segments, info = model.transcribe(
                processed_file_path,
                beam_size=5,
                word_timestamps=True,
                vad_filter=False,
                language="en",
                # initial_prompt="This is a song. Transcribe the lyrics accurately. Ignore background noise."
            )
            
            logger.info(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
            
            segments_list = list(segments)
            chunks = process_segments_to_chunks(segments_list)
            full_text = " ".join(chunk["text"] for chunk in chunks)
            
            logger.info(f"Transcription complete! Generated {len(chunks)} chunks")
            
            # Return paths for cleanup along with result
            return {
                "response": {
                    "result": {
                        "text": full_text,
                        "chunks": chunks
                    }
                },
                "vocals_path": vocals_path
            }

        # Run the heavy processing in a thread pool
        processing_result = await run_in_threadpool(process_audio_sync)
        
        # Extract results and cleanup paths
        vocals_path = processing_result.get("vocals_path")
        return processing_result["response"]

    except Exception as e:
        logger.error(f"STT Error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Speech-to-text processing failed: {str(e)}"
        )
    finally:
        # Clean up files
        files_to_remove = [temp_file_path]
        if vocals_path:
            files_to_remove.append(vocals_path)
        
        for f_path in files_to_remove:
            if f_path and os.path.exists(f_path):
                try:
                    os.unlink(f_path)
                    logger.info(f"Cleaned up file: {f_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up file {f_path}: {cleanup_error}")

@router.post("/translate")
async def translate_text(text: str = Query(...), target_lang: str = Query("en")):
    """
    Translation endpoint (currently disabled - requires additional dependencies).
    """
    raise HTTPException(
        status_code=501,
        detail="Translation feature requires additional setup. Please use external translation services."
    )
    
@router.post('/test/stt')
async def test_stt():
    try:
        logger.info("Test STT endpoint called")
        
        result = {
            "result": {
                "text": "I look up from the ground to see your sad and teary eyes You look away from me and I see there's something you're trying to hide And I reach for your hand but it's cold You pull away again and I wonder what's on your mind",
                "chunks": [
                    {
                        "text": "I look up from the ground to see your sad and teary eyes",
                        "timestamp": [0, 7.38],
                        "words": [
                            {"word": "I", "timestamp": [0, 0.2]},
                            {"word": "look", "timestamp": [0.2, 0.6]},
                            {"word": "up", "timestamp": [0.6, 0.9]},
                            {"word": "from", "timestamp": [0.9, 1.2]},
                            {"word": "the", "timestamp": [1.2, 1.4]},
                            {"word": "ground", "timestamp": [1.4, 2.0]},
                            {"word": "to", "timestamp": [2.0, 2.2]},
                            {"word": "see", "timestamp": [2.2, 2.6]},
                            {"word": "your", "timestamp": [2.6, 3.0]},
                            {"word": "sad", "timestamp": [3.0, 3.5]},
                            {"word": "and", "timestamp": [3.5, 3.7]},
                            {"word": "teary", "timestamp": [3.7, 4.3]},
                            {"word": "eyes", "timestamp": [4.3, 7.38]}
                        ]
                    },
                    {
                        "text": "You look away from me and I see there's something you're trying to hide",
                        "timestamp": [7.38, 11],
                        "words": [
                            {"word": "You", "timestamp": [7.38, 7.6]},
                            {"word": "look", "timestamp": [7.6, 7.9]},
                            {"word": "away", "timestamp": [7.9, 8.3]},
                            {"word": "from", "timestamp": [8.3, 8.6]},
                            {"word": "me", "timestamp": [8.6, 8.9]},
                            {"word": "and", "timestamp": [8.9, 9.0]},
                            {"word": "I", "timestamp": [9.0, 9.1]},
                            {"word": "see", "timestamp": [9.1, 9.4]},
                            {"word": "there's", "timestamp": [9.4, 9.7]},
                            {"word": "something", "timestamp": [9.7, 10.1]},
                            {"word": "you're", "timestamp": [10.1, 10.3]},
                            {"word": "trying", "timestamp": [10.3, 10.6]},
                            {"word": "to", "timestamp": [10.6, 10.75]},
                            {"word": "hide", "timestamp": [10.75, 11]}
                        ]
                    },
                    {
                        "text": "And I reach for your hand but it's cold",
                        "timestamp": [11, 13.5],
                        "words": [
                            {"word": "And", "timestamp": [11, 11.2]},
                            {"word": "I", "timestamp": [11.2, 11.3]},
                            {"word": "reach", "timestamp": [11.3, 11.7]},
                            {"word": "for", "timestamp": [11.7, 11.9]},
                            {"word": "your", "timestamp": [11.9, 12.1]},
                            {"word": "hand", "timestamp": [12.1, 12.5]},
                            {"word": "but", "timestamp": [12.5, 12.7]},
                            {"word": "it's", "timestamp": [12.7, 12.9]},
                            {"word": "cold", "timestamp": [12.9, 13.5]}
                        ]
                    },
                    {
                        "text": "You pull away again and I wonder what's on your mind",
                        "timestamp": [13.5, 18.32],
                        "words": [
                            {"word": "You", "timestamp": [13.5, 13.7]},
                            {"word": "pull", "timestamp": [13.7, 14.0]},
                            {"word": "away", "timestamp": [14.0, 14.4]},
                            {"word": "again", "timestamp": [14.4, 14.9]},
                            {"word": "and", "timestamp": [14.9, 15.1]},
                            {"word": "I", "timestamp": [15.1, 15.2]},
                            {"word": "wonder", "timestamp": [15.2, 15.7]},
                            {"word": "what's", "timestamp": [15.7, 16.0]},
                            {"word": "on", "timestamp": [16.0, 16.2]},
                            {"word": "your", "timestamp": [16.2, 16.5]},
                            {"word": "mind", "timestamp": [16.5, 18.32]}
                        ]
                    }
                ]
            }
        }
        
        logger.info(f"Test STT endpoint returning result")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in test endpoint: {str(e)}")