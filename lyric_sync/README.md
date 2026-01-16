# Lyric Sync Backend

This is the backend API for the Lyric Sync application, which automatically generates synchronized lyrics with word-level timestamps from audio files.

## Features

- **Automatic Speech Recognition**: Uses faster-whisper for accurate transcription
- **Word-level Timestamps**: Generates precise timestamps for each word
- **Segment Chunking**: Automatically segments lyrics into meaningful chunks
- **Multiple Audio Formats**: Supports MP3, WAV, FLAC, OGG, M4A, and more
- **GPU Acceleration**: Automatically uses CUDA if available for faster processing
- **Voice Activity Detection**: Filters out silence and background noise

## Setup

### 1. Install Dependencies

```bash
cd lyric_sync
pip install -r requirements.txt
```

**Note for Windows Users**: If you encounter issues installing `torch`, you may need to install it separately:

```bash
# For CPU only:
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# For GPU (CUDA 11.8):
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 2. Configure Environment Variables (Optional)

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to customize your settings:

- `WHISPER_MODEL`: Choose the model size (default: `base`)
  - `tiny`: Fastest, lowest accuracy
  - `base`: **Recommended** - Good balance
  - `small`: Better accuracy
  - `medium`: High accuracy
  - `large-v3`: Best accuracy (requires more RAM/VRAM)

- `WHISPER_DEVICE`: Device to use (default: `auto`)
  - `auto`: Automatically detect GPU
  - `cpu`: Force CPU usage
  - `cuda`: Force GPU usage

### 3. Run the Server

```bash
# From the project root directory
uvicorn lyric_sync.app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## API Endpoints

### POST /ai/stt

Upload an audio file and get synchronized lyrics with timestamps.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Audio file (field name: `audio`)

**Response:**
```json
{
  "result": {
    "text": "Full transcription text...",
    "chunks": [
      {
        "text": "First line of lyrics",
        "timestamp": [0.0, 3.5],
        "words": [
          {"word": "First", "timestamp": [0.0, 0.5]},
          {"word": "line", "timestamp": [0.5, 1.0]},
          {"word": "of", "timestamp": [1.0, 1.2]},
          {"word": "lyrics", "timestamp": [1.2, 3.5]}
        ]
      }
    ]
  }
}
```

### GET /health

Check if the server is running.

**Response:**
```json
{
  "status": "ok"
}
```

## Model Information

### First Run

On the first request, the Whisper model will be downloaded automatically. This may take a few minutes depending on your model choice:

- `tiny`: ~75 MB
- `base`: ~142 MB
- `small`: ~466 MB
- `medium`: ~1.5 GB
- `large-v3`: ~3 GB

Models are cached in your home directory (`~/.cache/huggingface/hub`) and only need to be downloaded once.

### Performance Tips

1. **GPU Usage**: If you have an NVIDIA GPU with CUDA support, the transcription will be significantly faster
2. **Model Selection**: Start with `base` model for good balance of speed and accuracy
3. **Memory**: Ensure you have enough RAM/VRAM for your chosen model size
4. **CPU Mode**: The `int8` compute type is optimized for CPU inference

## Troubleshooting

### "Model initialization timeout"
- The model is taking too long to load. Try a smaller model or ensure you have enough RAM.

### "CUDA out of memory"
- Your GPU doesn't have enough VRAM. Switch to a smaller model or use CPU mode by setting `WHISPER_DEVICE=cpu`.

### "Failed to initialize Whisper model"
- Check the logs for specific error details
- Ensure all dependencies are installed correctly
- Try reinstalling `faster-whisper`: `pip install --upgrade faster-whisper`

### Slow Processing
- First run is always slower (model download + initialization)
- Use GPU if available for 5-10x speed improvement
- Consider using a smaller model for faster processing

## Development

To run with auto-reload during development:

```bash
uvicorn lyric_sync.app:app --reload --log-level debug
```

## Dependencies

Key dependencies:
- `fastapi`: Web framework
- `faster-whisper`: Optimized Whisper implementation
- `torch`: PyTorch for model inference
- `uvicorn`: ASGI server

See `requirements.txt` for full list.

