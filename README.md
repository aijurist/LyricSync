# 🎵 Lyric Syncer

An AI-powered web application that automatically generates synchronized lyrics with precise timestamps from audio files. Built with React, FastAPI, and OpenAI Whisper-X for accurate speech-to-text transcription and word-level alignment.

![Lyric Syncer Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-19.1.1-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green)
![Whisper](https://img.shields.io/badge/Whisper-X-Large%20v3-orange)

## ✨ Features

### 🎯 Core Functionality
- **AI-Powered Transcription**: Uses OpenAI Whisper-X for accurate speech-to-text conversion
- **Precise Timestamp Alignment**: Word-level synchronization with millisecond accuracy
- **Real-time Playback**: Interactive audio player with synchronized lyric highlighting
- **LRC Export**: Generate standard LRC files compatible with media players and karaoke software
- **Click-to-Seek**: Click any lyric line to jump to that exact moment in the audio

### 🎨 User Experience
- **Modern UI**: Clean, professional interface built with shadcn/ui components
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Auto-scroll**: Lyrics automatically scroll to keep the active line visible
- **Progress Tracking**: Real-time processing status with detailed progress indicators
- **File Validation**: Supports multiple audio formats with size and type validation

### 🔧 Technical Features
- **CORS Support**: Proper cross-origin resource sharing for local development
- **Error Handling**: Comprehensive error messages and fallback mechanisms
- **Type Safety**: Full TypeScript support for better development experience
- **Performance**: Optimized for large audio files with efficient processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Hugging Face API token (for Whisper-X inference)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lyric_sync
   ```

2. **Install Python dependencies**
   ```bash
   pip install fastapi uvicorn huggingface-hub python-multipart
   ```

3. **Configure environment variables**
   Create a `.env` file in the `lyric_sync` directory:
   ```env
   HF_TOKEN=your_huggingface_token_here
   ```

4. **Start the backend server**
   ```bash
   cd lyric_sync
   uvicorn lyric_sync.app:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm install tailwindcss @tailwindcss/vite @types/node
   ```

3. **Initialize shadcn/ui**
   ```bash
   npx shadcn@latest init
   # Choose your preferred options (recommended: Neutral color, CSS variables)
   ```

4. **Add required components**
   ```bash
   npx shadcn@latest add button card input progress separator badge
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
lyric_sync/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/ui/    # shadcn/ui components
│   │   ├── App.tsx          # Main application component
│   │   └── main.tsx         # Application entry point
│   ├── package.json
│   └── vite.config.ts       # Vite configuration
├── lyric_sync/              # FastAPI backend
│   ├── ai/
│   │   └── whisper_inf.py   # Whisper-X inference endpoint
│   ├── config/
│   │   └── envs.py          # Environment configuration
│   └── app.py               # FastAPI application
└── README.md
```

## 🎮 Usage Guide

### 1. Upload Audio File
- Click "Choose Audio File" to select an audio file
- Supported formats: MP3, WAV, M4A, FLAC, OGG
- Maximum file size: 25MB
- The application will display file details and size

### 2. Process with AI
- Click "Sync Lyrics with AI" to begin transcription
- Watch the progress bar with detailed status updates:
  - Initializing Whisper-X model
  - Converting audio format
  - Transcribing with AI
  - Aligning timestamps
  - Finalizing results

### 3. Play and Sync
- Use the audio player controls to play/pause
- Skip forward/backward 10 seconds
- Click the progress bar to seek to specific times
- Watch lyrics highlight in real-time as the audio plays

### 4. Interactive Lyrics
- Click any lyric line to jump to that moment
- Lyrics automatically scroll to keep the active line visible
- Each line shows start/end times and duration
- Hover effects provide visual feedback

### 5. Export LRC File
- Click "Download LRC File" to export synchronized lyrics
- LRC files include metadata and precise timestamps
- Compatible with media players, karaoke software, and music apps

## 🔧 API Endpoints

### POST `/ai/stt/`
Processes audio files and returns synchronized lyrics.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file in `audio` field

**Response:**
```json
{
  "result": {
    "text": "Full transcription text",
    "chunks": [
      {
        "text": "Individual lyric line",
        "timestamp": [start_time, end_time]
      }
    ]
  }
}
```

## 🛠️ Configuration

### Environment Variables
- `HF_TOKEN`: Hugging Face API token for Whisper-X inference
- `CORS_ORIGINS`: Allowed frontend origins (default: localhost:5173, localhost:3000)

### Audio Processing Settings
- **Model**: OpenAI Whisper Large v3
- **Language**: Auto-detection (supports 100+ languages)
- **Alignment**: Word-level timestamp precision
- **Processing Time**: 30-60 seconds depending on audio length

## 🎨 Customization

### Styling
The application uses Tailwind CSS with shadcn/ui components. Customize the theme by modifying:
- `frontend/src/index.css` - Global styles and CSS variables
- `frontend/components.json` - shadcn/ui configuration

### Components
Add new shadcn/ui components:
```bash
npx shadcn@latest add [component-name]
```

## 🚀 Deployment

### Backend Deployment
1. **Docker** (recommended):
   ```dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["uvicorn", "lyric_sync.app:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. **Cloud Platforms**:
   - **Railway**: Connect GitHub repository
   - **Render**: Deploy as Python web service
   - **Heroku**: Use Procfile for deployment

### Frontend Deployment
1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to**:
   - **Vercel**: Connect GitHub repository
   - **Netlify**: Drag and drop `dist` folder
   - **GitHub Pages**: Use GitHub Actions

## 🔍 Troubleshooting

### Common Issues

**Backend Connection Error**
- Ensure backend is running on `localhost:8000`
- Check CORS configuration in `app.py`
- Verify Hugging Face API token is valid

**Audio Processing Fails**
- Check file format is supported
- Ensure file size is under 25MB
- Verify internet connection for API calls

**Frontend Build Errors**
- Clear `node_modules` and reinstall dependencies
- Check TypeScript configuration
- Verify shadcn/ui setup

### Debug Mode
Enable debug logging in the backend:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI Whisper-X**: For advanced speech recognition capabilities
- **Hugging Face**: For providing the inference infrastructure
- **shadcn/ui**: For the beautiful component library
- **FastAPI**: For the robust backend framework
- **React**: For the responsive frontend framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/lyric-sync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/lyric-sync/discussions)
- **Email**: your-email@example.com

---

**Made with ❤️ for music lovers and developers**
