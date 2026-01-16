
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
	# Optional: Hugging Face token for using cloud models
	# Not required for local faster-whisper
	HF_TOKEN: Optional[str] = None
	
	# Whisper model settings
	WHISPER_MODEL: str = "base"  # Options: tiny, base, small, medium, large-v2, large-v3
	WHISPER_DEVICE: str = "auto"  # Options: auto, cpu, cuda
	WHISPER_COMPUTE_TYPE: str = "auto"  # Options: auto, int8, float16, float32

	class Config:
		env_file = ".env"
		env_file_encoding = "utf-8"

settings = Settings()
