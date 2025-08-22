
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
	HF_TOKEN: str

	class Config:
		env_file = ".env"

settings = Settings()
