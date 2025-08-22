from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from lyric_sync.ai.whisper_inf import router as ai_router

app = FastAPI(title="Lyric Sync API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)

# To run: uvicorn lyric_sync.app:app --reload