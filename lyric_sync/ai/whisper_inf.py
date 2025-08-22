from fastapi import APIRouter, UploadFile, File, HTTPException
from huggingface_hub import InferenceClient
from lyric_sync.config.envs import settings

client = InferenceClient(
    provider="auto",
    api_key=settings.HF_TOKEN,
)

router = APIRouter(prefix="/ai")

@router.post("/stt/")
async def stt_endpoint(audio: UploadFile = File(...)):
    if not audio.content_type.startswith("audio"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an audio file.")
    try:
        audio_bytes = await audio.read()
        output = client.automatic_speech_recognition(audio_bytes, model="openai/whisper-large-v3")

        if isinstance(output, dict) and "text" in output and "chunks" in output:
            return {"result": output}
        else:
            raise HTTPException(status_code=500, detail="Invalid output format from Whisper")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))