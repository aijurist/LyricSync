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
    
@router.post('/test/stt')
async def test_stt():
    return {
        "result": {
            "text": " I look up from the ground to see your sad and teary eyes You look away from me and I see there's something you're trying to hide And I reach for your hand but it's cold You pull away again and I wonder what's on your mind And then you say to me you made a dumb mistake You start to tremble and your voice begins to break You say the cigarettes on the counter weren't your friends, they were my mates And I feel the colour draining from my face And my friend said I know you love her but it's over, mate It doesn't matter, put the phone away It's never easy to walk away Let her go, it'll be alright So I used to look back at all the messages you'd sent And I know it wasn't right, but it was fucking with my head And everything deleted like the past, yeah it was gone And when I touched your face I could tell you're moving on But it's not the fact that you kissed him yesterday It's the feeling of betrayal That I just can't seem to shake And everything I know tells me That I should walk away But I just wanna stay And my friend said I know you love her but it's over, mate It doesn't matter, put the phone away It's never easy to walk away Let her go, it'll be okay It's gonna hurt for a bit of time So bottoms up, let's forget tonight You'll find another and you'll be just fine Let her go Nothing heals The past like time And they can't steal The love you're born to find But nothing heals the past like time And they can't steal the love you're born to find I know you love her but it's over, mate It doesn't matter, put the phone away It's never easy to walk away Let her go, it'll be okay It's gonna hurt for a bit of time Two bottoms up, let's forget tonight You'll find another and you'll be just fine Let her go It'll be alright It'll be alright It'll be alright It'll be alright, it'll be alright It'll be alright, it'll be alright",
            "chunks": [
                {
                    "text": " I look up from the ground to see your sad and teary eyes",
                    "timestamp": [0, 7.38]
                },
                {
                    "text": " You look away from me and I see there's something you're trying to hide",
                    "timestamp": [7.38, 11]
                },
                {
                    "text": " And I reach for your hand but it's cold",
                    "timestamp": [11, 13.5]
                },
                {
                    "text": " You pull away again and I wonder what's on your mind",
                    "timestamp": [13.5, 18.32]
                },
                {
                    "text": " And then you say to me you made a dumb mistake",
                    "timestamp": [18.32, 22.58]
                },
                {
                    "text": " You start to tremble and your voice begins to break",
                    "timestamp": [22.58, 26.1]
                },
                {
                    "text": " You say the cigarettes on the counter weren't your friends, they were my mates",
                    "timestamp": [26.1, 29.96]
                },
                {
                    "text": " And I feel the colour draining from my face",
                    "timestamp": [29.96, 33.14]
                }
            ]
        }
    }