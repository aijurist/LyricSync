# 🎵 Lyric Sync

A full-stack web application that generates synchronized lyrics with word-level precision from audio files using AI transcription. Built with React + TypeScript frontend and FastAPI backend.

![Status](https://img.shields.io/badge/Status-Development-brightgreen)
![React](https://img.shields.io/badge/React-19.1.1-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.116.1-green)
![Python](https://img.shields.io/badge/Python-3.8+-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)

## 🚀 Tech Stack

### Frontend
- **React 19.1.1** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Wavesurfer.js** for audio visualization
- **Lucide React** for icons

### Backend
- **FastAPI 0.116.1** for API server
- **OpenAI Whisper** for speech-to-text
- **Hugging Face Hub** for model inference
- **Python 3.8+** runtime
- **Uvicorn** ASGI server

## ✨ Features

- **Word-level lyric synchronization** with millisecond precision
- **Real-time audio playback** with interactive lyrics
- **Multi-language support** (100+ languages)
- **Translation capabilities** for non-English lyrics
- **LRC file export** for karaoke applications
- **Dark/light theme** support
- **Responsive design** with resizable panels
- **Audio format support**: MP3, WAV, M4A, FLAC, OGG

## 🛠️ Development Setup

### Prerequisites
- **Node.js 18+** and npm
- **Python 3.8+**
- **Hugging Face API token** ([Get one here](https://huggingface.co/settings/tokens))

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/lyric_sync.git
cd lyric_sync
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r lyric_sync/requirements.txt

# Set up environment variables
echo "HF_TOKEN=your_huggingface_token_here" > .env

# Start backend server
uvicorn lyric_sync.app:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:**
- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

### 3. Frontend Setup

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

**Frontend will be available at:** `http://localhost:5173`

### 4. Development Scripts

**Backend:**
```bash
# Run with auto-reload
uvicorn lyric_sync.app:app --reload

# Run with custom settings
uvicorn lyric_sync.app:app --reload --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
```

**Frontend:**
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📖 Usage

1. **Upload Audio**: Select an audio file (MP3, WAV, M4A, FLAC, OGG, max 25MB)
2. **Sync Lyrics**: Click "Sync Lyrics with AI" to process with Whisper
3. **Play & Interact**: 
   - Words highlight in real-time during playback
   - Click any lyric to jump to that moment
   - Use playback controls (speed, loop, seek)
4. **Edit & Export**: 
   - Edit lyrics and timestamps manually
   - Translate non-English lyrics
   - Export as LRC file for karaoke apps

## 🏗️ Project Structure

```
lyric_sync/
├── frontend/                     # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── own/             # Custom components
│   │   │   │   ├── AudioPlayerPanel.tsx
│   │   │   │   ├── FileUploadPanel.tsx
│   │   │   │   ├── InfoPanel.tsx
│   │   │   │   ├── LyricsPanel.tsx
│   │   │   │   └── TopStatusBar.tsx
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── lib/
│   │   │   └── utils.ts         # Utility functions
│   │   ├── App.tsx              # Main application component
│   │   ├── types.ts             # TypeScript type definitions
│   │   └── main.tsx             # Application entry point
│   ├── package.json             # Frontend dependencies
│   ├── vite.config.ts           # Vite configuration
│   └── tailwind.config.js       # Tailwind CSS config
├── lyric_sync/                  # FastAPI backend
│   ├── ai/
│   │   ├── __init__.py
│   │   └── whisper_inf.py      # Whisper AI inference
│   ├── config/
│   │   └── envs.py             # Environment configuration
│   ├── app.py                  # FastAPI application entry
│   └── requirements.txt        # Python dependencies
└── README.md
```

## 🔌 API Reference

### Core Endpoints

**POST `/ai/stt`** - Speech-to-text with word-level timestamps
```bash
curl -X POST "http://localhost:8000/ai/stt" \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@song.mp3"
```

**POST `/ai/translate`** - Translate text to English
```bash
curl -X POST "http://localhost:8000/ai/translate?text=Bonjour&target_lang=en"
```

**GET `/health`** - Health check
```bash
curl http://localhost:8000/health
```

**GET `/docs`** - Interactive API documentation (Swagger UI)

### Response Format
```json
{
  "result": {
    "text": "Full transcription",
    "chunks": [
      {
        "text": "I look up from the ground",
        "timestamp": [0, 2.5],
        "words": [
          {"word": "I", "timestamp": [0, 0.2]},
          {"word": "look", "timestamp": [0.2, 0.6]}
        ]
      }
    ]
  }
}
```

## ⚙️ Configuration

### Environment Variables
```env
HF_TOKEN=your_huggingface_token_here  # Required for Whisper inference
```

### Audio Processing
- **Model**: OpenAI Whisper Large v3 Turbo
- **Languages**: 100+ languages (auto-detection)
- **Precision**: Word-level timestamps (±0.1s accuracy)
- **Processing**: 30-60 seconds per file
- **File Size**: Max 25MB

## 🎨 Development

### Frontend Customization
- **Styling**: Tailwind CSS with dark/light mode
- **Components**: shadcn/ui component library
- **Icons**: Lucide React
- **Audio**: Wavesurfer.js for visualization

### Adding Components
```bash
cd frontend
npx shadcn@latest add [component-name]
```

## 🚀 Deployment

### Backend (Docker)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY lyric_sync/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY lyric_sync/ ./lyric_sync/
ENV HF_TOKEN=your_token_here
EXPOSE 8000
CMD ["uvicorn", "lyric_sync.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend
```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel, Netlify, or any static host
```

### Cloud Platforms
- **Railway/Render**: Direct GitHub integration
- **Vercel**: Frontend + serverless functions
- **AWS/Azure/GCP**: Container deployment

## 🔍 Troubleshooting

**Backend Issues:**
```bash
curl http://localhost:8000/health  # Check if running
echo $HF_TOKEN                     # Verify token
```

**Frontend Issues:**
```bash
rm -rf node_modules package-lock.json && npm install  # Clear cache
node --version  # Should be 18+
```

**Audio Processing:**
- File size < 25MB
- Clear audio quality works best
- Valid HF_TOKEN required

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and commit: `git commit -m 'Add amazing feature'`
4. Push and open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for music lovers and developers**
