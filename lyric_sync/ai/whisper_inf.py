from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from huggingface_hub import InferenceClient
from lyric_sync.config.envs import settings
import logging
import tempfile
import os

logger = logging.getLogger(__name__)

client = InferenceClient(
    provider="fal-ai",
    api_key=settings.HF_TOKEN,
)
  
router = APIRouter(prefix="/ai")

@router.post("/stt")
async def stt_endpoint(audio: UploadFile = File(...)):
    logger.info(f"Received file: {audio.filename}, content_type: {audio.content_type}, size: {audio.size}")
    temp_file = None
    try:
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
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        # Use the file path instead of raw bytes
        output = client.automatic_speech_recognition(temp_file_path, model="openai/whisper-large-v3")

        if isinstance(output, dict) and "text" in output:
            return {
                "result": {
                    "text": output["text"],
                    "chunks": output.get("chunks", [])
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Unexpected response format from Whisper")

    except Exception as e:
        logger.error(f"STT Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Speech-to-text processing failed")
    finally:
        # Clean up the temporary file
        if temp_file and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up temporary file: {cleanup_error}")

@router.post("/translate")
async def translate_text(text: str = Query(...), target_lang: str = Query("en")):
    try:
        result = client.translation(
            text,
            model="facebook/nllb-200-distilled-600M",
            src_lang="eng_Latn" if target_lang != "en" else "auto",
            tgt_lang=f"{target_lang}_Latn"
        )
        
        if isinstance(result, dict) and "translation_text" in result:
            return {"translated_text": result["translation_text"]}
        elif isinstance(result, str):
            return {"translated_text": result}
        else:
            raise HTTPException(status_code=500, detail="Invalid translation response")
    except Exception as e:
        logger.error(f"Translation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
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