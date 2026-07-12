/**
 * AirDraw AI — Main Application Logic
 * Hand-gesture drawing + mouse sidebar tools
 */

const videoEl = document.getElementById('webcam');
const canvasEl = document.getElementById('draw-canvas');
const ctx = canvasEl.getContext('2d');
const cursorEl = document.getElementById('cursor-indicator');
const statusDot = document.getElementById('status-dot');
const statusMode = document.getElementById('status-mode');
const statusFps = document.getElementById('status-fps');
const toolIndicator = document.getElementById('indicator-tool');
const sizeIndicator = document.getElementById('indicator-size');
const swatchIndicator = document.getElementById('indicator-swatch');
const permissionOverlay = document.getElementById('permission-overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const startBtn = document.getElementById('start-btn');
const clearBtn = document.getElementById('clear-btn');
const saveBtn = document.getElementById('save-btn');
const sidebar = document.getElementById('sidebar');
const canvasArea = document.getElementById('canvas-area');

const state = {
  tool: 'pencil',
  color: '#ef4444',
  thickness: 3,
  eraserSize: 15,
  mode: 'idle',
  isDrawing: false,
  lastPoint: null,
  lastMidPoint: null,
  frameCount: 0,
  lastFpsTime: performance.now(),
  fps: 0,
  handDetected: false,
  cameraActive: false,
  toolSettingsApplied: false,
};

const LANDMARK = {
  THUMB_TIP: 4, THUMB_IP: 3,
  INDEX_TIP: 8, INDEX_PIP: 6,
  MIDDLE_TIP: 12, MIDDLE_PIP: 10,
  RING_TIP: 16, RING_PIP: 14,
  PINKY_TIP: 20, PINKY_PIP: 18,
};

function isFingerExtended(landmarks, tipIdx, pipIdx) {
  return landmarks[tipIdx].y < landmarks[pipIdx].y - 0.02;
}

function isThumbExtended(landmarks, handedness) {
  const tip = landmarks[LANDMARK.THUMB_TIP];
  const ip = landmarks[LANDMARK.THUMB_IP];
  return handedness === 'Right' ? tip.x < ip.x - 0.02 : tip.x > ip.x + 0.02;
}

/** draw | erase | pause | idle */
function detectGesture(landmarks, handedness) {
  const indexUp = isFingerExtended(landmarks, LANDMARK.INDEX_TIP, LANDMARK.INDEX_PIP);
  const middleUp = isFingerExtended(landmarks, LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_PIP);
  const ringUp = isFingerExtended(landmarks, LANDMARK.RING_TIP, LANDMARK.RING_PIP);
  const pinkyUp = isFingerExtended(landmarks, LANDMARK.PINKY_TIP, LANDMARK.PINKY_PIP);
  const thumbUp = isThumbExtended(landmarks, handedness);
  const extendedCount = [indexUp, middleUp, ringUp, pinkyUp, thumbUp].filter(Boolean).length;

  if (extendedCount >= 5) return 'erase';
  if (extendedCount === 0) return 'pause';
  if (indexUp && !middleUp && !ringUp && !pinkyUp) return 'draw';
  return 'idle';
}

function landmarkToCanvasViewport(landmark) {
  const rect = canvasArea.getBoundingClientRect();
  const x = (1 - landmark.x) * rect.width;
  const y = landmark.y * rect.height;
  return { clientX: rect.left + x, clientY: rect.top + y };
}

function viewportToCanvas(clientX, clientY) {
  const rect = canvasArea.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return null;
  }
  return {
    x: canvasEl.width - ((clientX - rect.left) / rect.width) * canvasEl.width,
    y: ((clientY - rect.top) / rect.height) * canvasEl.height,
  };
}

function beginStroke() {
  state.lastPoint = null;
  state.lastMidPoint = null;
}

function drawSmoothLine(x, y) {
  if (!state.lastPoint) {
    state.lastPoint = { x, y };
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.stroke();
    return;
  }
  const midX = (state.lastPoint.x + x) / 2;
  const midY = (state.lastPoint.y + y) / 2;
  ctx.beginPath();
  if (state.lastMidPoint) {
    ctx.moveTo(state.lastMidPoint.x, state.lastMidPoint.y);
    ctx.quadraticCurveTo(state.lastPoint.x, state.lastPoint.y, midX, midY);
  } else {
    ctx.moveTo(state.lastPoint.x, state.lastPoint.y);
    ctx.lineTo(midX, midY);
  }
  ctx.stroke();
  state.lastPoint = { x, y };
  state.lastMidPoint = { x: midX, y: midY };
}

function eraseAt(x, y, radius) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function applyToolSettings(force = false) {
  if (!force && state.toolSettingsApplied) return;
  if (state.mode === 'erase' || state.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = state.eraserSize;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.thickness;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  state.toolSettingsApplied = true;
}

function activateTarget(el) {
  if (el.id === 'clear-btn') {
    clearCanvas();
    return;
  }
  if (el.id === 'save-btn') {
    saveDrawing();
    return;
  }
  if (el.dataset.tool) {
    document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
    el.classList.add('active');
    state.tool = el.dataset.tool;
    const size = parseInt(el.dataset.thickness, 10);
    if (state.tool === 'pencil') state.thickness = size;
    else state.eraserSize = size;
    state.toolSettingsApplied = false;
    updateToolIndicator();
    return;
  }
  if (el.dataset.color) {
    document.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'));
    el.classList.add('active');
    state.color = el.dataset.color;
    state.tool = 'pencil';
    state.toolSettingsApplied = false;
    updateToolIndicator();
  }
}

function updateToolIndicator() {
  const toolNames = { pencil: 'Pencil', eraser: 'Eraser' };
  toolIndicator.textContent = toolNames[state.tool] || 'Pencil';
  sizeIndicator.textContent = state.tool === 'pencil'
    ? `${state.thickness}px`
    : `${state.eraserSize}px`;
  swatchIndicator.style.background = state.color;
}

function updateCursor(clientX, clientY, mode) {
  cursorEl.classList.remove('hidden', 'mode-draw', 'mode-erase', 'mode-pause');
  cursorEl.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`;
  if (mode === 'draw') cursorEl.classList.add('mode-draw');
  else if (mode === 'erase') cursorEl.classList.add('mode-erase');
  else if (mode === 'pause') cursorEl.classList.add('mode-pause');
}

function updateStatus(mode) {
  const labels = {
    idle: 'Hand detected',
    draw: '✏️ Drawing',
    pause: '✊ Paused',
    erase: '🖐️ Erasing',
  };
  statusMode.textContent = state.handDetected ? (labels[mode] || 'Hand detected') : 'Waiting for hand...';
  statusDot.className = 'status-dot';
  if (!state.handDetected) return;
  if (mode === 'pause') statusDot.classList.add('paused');
  else statusDot.classList.add('active');
}

function updateFps() {
  state.frameCount++;
  const now = performance.now();
  if (now - state.lastFpsTime >= 1000) {
    state.fps = state.frameCount;
    state.frameCount = 0;
    state.lastFpsTime = now;
    statusFps.textContent = `${state.fps} FPS`;
  }
}

function resizeCanvas() {
  const rect = canvasArea.getBoundingClientRect();
  canvasEl.width = rect.width;
  canvasEl.height = rect.height;
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  beginStroke();
}

function saveDrawing() {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvasEl.width;
  exportCanvas.height = canvasEl.height;
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.save();
  exportCtx.scale(-1, 1);
  exportCtx.drawImage(videoEl, -exportCanvas.width, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.restore();
  exportCtx.save();
  exportCtx.scale(-1, 1);
  exportCtx.drawImage(canvasEl, -exportCanvas.width, 0);
  exportCtx.restore();
  const link = document.createElement('a');
  link.download = `airdraw-${Date.now()}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

let hands = null;
let processing = false;
const PROCESS_WIDTH = 640;
const PROCESS_HEIGHT = 480;
const processCanvas = document.createElement('canvas');
processCanvas.width = PROCESS_WIDTH;
processCanvas.height = PROCESS_HEIGHT;
const processCtx = processCanvas.getContext('2d', { alpha: false, desynchronized: true });

function initHands() {
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  hands.onResults(onHandResults);
}

function detectionLoop() {
  if (!state.cameraActive) return;
  if (!processing && videoEl.readyState >= 2) {
    processing = true;
    processCtx.drawImage(videoEl, 0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);
    hands.send({ image: processCanvas }).finally(() => { processing = false; });
  }
  requestAnimationFrame(detectionLoop);
}

function onHandResults(results) {
  updateFps();
  state.handDetected = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

  if (!state.handDetected) {
    state.mode = 'idle';
    if (state.isDrawing) {
      state.isDrawing = false;
      beginStroke();
    }
    cursorEl.classList.add('hidden');
    updateStatus('idle');
    return;
  }

  const landmarks = results.multiHandLandmarks[0];
  const handedness = results.multiHandedness[0]?.label || 'Right';
  const gesture = detectGesture(landmarks, handedness);
  state.mode = gesture;

  const viewportPos = landmarkToCanvasViewport(landmarks[LANDMARK.INDEX_TIP]);
  const canvasPos = viewportToCanvas(viewportPos.clientX, viewportPos.clientY);

  updateCursor(viewportPos.clientX, viewportPos.clientY, gesture);
  updateStatus(gesture);

  switch (gesture) {
    case 'draw':
      if (!canvasPos) break;
      applyToolSettings(true);
      if (!state.isDrawing) {
        state.isDrawing = true;
        beginStroke();
      }
      drawSmoothLine(canvasPos.x, canvasPos.y);
      break;

    case 'erase':
      if (!canvasPos) break;
      if (state.isDrawing) {
        state.isDrawing = false;
        beginStroke();
      }
      eraseAt(canvasPos.x, canvasPos.y, state.tool === 'eraser' ? state.eraserSize : 25);
      break;

    default:
      if (state.isDrawing) {
        state.isDrawing = false;
        beginStroke();
      }
      break;
  }
}

async function startCamera() {
  loadingOverlay.classList.remove('hidden');
  try {
    initHands();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    resizeCanvas();
    state.cameraActive = true;
    permissionOverlay.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    detectionLoop();
  } catch (err) {
    loadingOverlay.classList.add('hidden');
    permissionOverlay.classList.remove('hidden');
    const card = permissionOverlay.querySelector('.permission-card');
    const errMsg = card.querySelector('.permission-error') || document.createElement('p');
    errMsg.className = 'permission-error';
    errMsg.style.color = 'var(--danger)';
    errMsg.textContent = `Could not access camera: ${err.message}. Please allow camera permissions and try again.`;
    if (!card.contains(errMsg)) card.appendChild(errMsg);
  }
}

startBtn.addEventListener('click', startCamera);
clearBtn.addEventListener('click', clearCanvas);
saveBtn.addEventListener('click', saveDrawing);

sidebar.addEventListener('click', (e) => {
  const target = e.target.closest('.tool-btn, .color-btn, .action-btn');
  if (target) activateTarget(target);
});

window.addEventListener('resize', resizeCanvas);
updateToolIndicator();
