# AirDraw AI

> Draw in the air with your hands using real-time webcam hand tracking. No install, no backend — runs entirely in your browser. 100% client-side & private.

## Features

- **Hand Gesture Drawing** - Control drawing with natural hand gestures via MediaPipe
- **Live Webcam Overlay** - See yourself while drawing on a transparent canvas
- **Pencil & Eraser Tools** - Thin, medium, and thick brush sizes
- **10-Color Palette** - Red, blue, green, yellow, black, white, orange, purple, pink, cyan
- **Gesture Controls** - Index finger to draw, fist to pause, open palm to erase
- **Save as PNG** - Export your artwork with webcam background included
- **Dark Modern UI** - Sleek interface with live FPS and gesture status
- **Privacy First** - All processing happens on your device, nothing is uploaded

## Gestures

| Gesture | Action |
|---------|--------|
| ☝️ Index finger up | Draw |
| ✊ Fist | Pause |
| 🖐️ Open palm | Erase |
| 🖱️ Mouse click on sidebar | Change tools & colors |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/danialaffridi/AIR-DRAW-AI.git

# Open in browser
# Simply open index.html in Chrome, Edge, or Firefox
```

Or run a local server:

```bash
cd AIR-DRAW-AI
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) and click **Allow Camera & Start**.

## Project Structure

```
AIR-DRAW-AI/
├── index.html      # Main app layout & UI
├── script.js       # Hand tracking, gestures & drawing logic
├── style.css       # Dark theme styles
└── LICENSE         # MIT License
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 Canvas | Drawing surface |
| JavaScript | App logic & gesture detection |
| MediaPipe Hands | Real-time hand landmark tracking |
| WebRTC | Webcam access |

## How It Works

1. **Camera** captures your hand via webcam
2. **MediaPipe** detects 21 hand landmarks in real-time
3. **Gesture Engine** maps finger positions to draw / pause / erase modes
4. **Canvas API** renders smooth strokes with quadratic curves
5. **Export** merges webcam feed + drawing into a single PNG

## Roadmap

- [ ] Two-hand support for zoom & pan
- [ ] Undo / redo strokes
- [ ] Shape recognition (circle, square, line)
- [ ] Brush opacity & gradient colors
- [ ] Full-screen presentation mode
- [ ] Mobile touch fallback

## Requirements

- Modern browser (Chrome, Edge, Firefox)
- Webcam with camera permission
- Good lighting for accurate hand tracking

---

*Built with ❤️ by [danialaffridi](https://github.com/danialaffridi)*
