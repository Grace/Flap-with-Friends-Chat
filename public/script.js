const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const BASE_WIDTH = 400;
const BASE_HEIGHT = 400;
const BASE_BIRD_SIZE = 24;
const BASE_PIPE_WIDTH = 50;
const BASE_GAP_HEIGHT = 100;
const BASE_BIRD_X = 50;
const INITIAL_BIRD_X_PERCENT = 0.125; // 12.5% from left
const INITIAL_BIRD_Y_PERCENT = 0.5;   // 50% from top
let currentScale = 1;

const GAME_WORLD = {
    width: 400,  // Virtual world width
    height: 400, // Virtual world height
    toScreen: function(coord, dimension = 'width') {
        return coord / this[dimension] * (dimension === 'width' ? canvas.width : canvas.height);
    },
    fromScreen: function(coord, dimension = 'width') {
        return coord / (dimension === 'width' ? canvas.width : canvas.height) * this[dimension];
    }
};

const BIRD_PARTS = {
    BEAK_WIDTH: 8,
    BEAK_HEIGHT: 6,
    WING_WIDTH: 12,
    WING_HEIGHT: 8,
    FLAP_INTERVAL: 1000,  // Changed from 2000 to 1000ms
    WING_UP_OFFSET: 0.25, // 25% from top of bird
    WING_DOWN_OFFSET: 0.5 // 50% from top of bird
};

// Music constants
const MUSIC = {
    context: null,
    gainNode: null,
    isPlaying: false,
    tempo: 150,  // Faster tempo for lighter feel
    notes: {
        C3: 130.81,
        D3: 146.83,
        E3: 164.81,
        F3: 174.61,
        G3: 196.00,
        A3: 220.00,
        B3: 246.94,
        C4: 261.63,
        D4: 293.66,
        E4: 329.63,
        F4: 349.23,
        G4: 392.00,
        A4: 440.00,
        B4: 493.88,
        C5: 523.25,
        D5: 587.33,
        E5: 659.25,
        F5: 698.46,
        G5: 783.99
    },
    noteLength: 150, // Shorter notes for bouncier feel
    scheduledLoop: null,
    activeNodes: [], // Track active oscillators and envelopes
    cleanup: function() {
        // Stop all active nodes
        this.activeNodes.forEach(node => {
            if (node.stop) node.stop();
            if (node.disconnect) node.disconnect();
        });
        this.activeNodes = [];
        if (this.scheduledLoop) {
            clearTimeout(this.scheduledLoop);
            this.scheduledLoop = null;
        }
    }
};

function initAudio() {
    MUSIC.context = new (window.AudioContext || window.webkitAudioContext)();
    MUSIC.gainNode = MUSIC.context.createGain();
    MUSIC.gainNode.gain.value = 0.1; // Set volume
    MUSIC.gainNode.connect(MUSIC.context.destination);
}

function createNoteEnvelope(startTime, duration) {
    const envelope = MUSIC.context.createGain();
    envelope.connect(MUSIC.gainNode);
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    envelope.gain.linearRampToValueAtTime(0.2, startTime + duration * 0.3);
    envelope.gain.linearRampToValueAtTime(0, startTime + duration);
    return envelope;
}

function playNote(frequency, startTime, duration, type = 'square') {
    const oscillator = MUSIC.context.createOscillator();
    const envelope = createNoteEnvelope(startTime, duration);
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.connect(envelope);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    // Track active nodes
    MUSIC.activeNodes.push(oscillator);
    MUSIC.activeNodes.push(envelope);
    
    // Remove nodes after they finish
    setTimeout(() => {
        const oscIndex = MUSIC.activeNodes.indexOf(oscillator);
        const envIndex = MUSIC.activeNodes.indexOf(envelope);
        if (oscIndex > -1) MUSIC.activeNodes.splice(oscIndex, 1);
        if (envIndex > -1) MUSIC.activeNodes.splice(envIndex, 1);
    }, (startTime + duration) * 1000);
}

function playMelody() {
    if (!MUSIC.isPlaying) return;
    
    const now = MUSIC.context.currentTime;
    const quarterNote = 60 / MUSIC.tempo;
    
    // Ascending/descending melody patterns for "flying" feel
    const melody = [
        // Soaring intro
        MUSIC.notes.E4, MUSIC.notes.G4, MUSIC.notes.C5, MUSIC.notes.E5,
        MUSIC.notes.D5, MUSIC.notes.G4, MUSIC.notes.E4, null,
        MUSIC.notes.C5, MUSIC.notes.E5, MUSIC.notes.G5, MUSIC.notes.E5,
        MUSIC.notes.C5, MUSIC.notes.G4, null, null,

        // Floating theme
        MUSIC.notes.E5, MUSIC.notes.C5, MUSIC.notes.G4, MUSIC.notes.E4,
        MUSIC.notes.G4, MUSIC.notes.C5, null, MUSIC.notes.E5,
        MUSIC.notes.D5, MUSIC.notes.B4, MUSIC.notes.G4, null,
        MUSIC.notes.A4, MUSIC.notes.C5, MUSIC.notes.E5, null,

        // Diving bridge
        MUSIC.notes.G5, MUSIC.notes.E5, MUSIC.notes.C5, MUSIC.notes.G4,
        MUSIC.notes.A4, MUSIC.notes.C5, MUSIC.notes.E5, MUSIC.notes.C5,
        MUSIC.notes.D5, MUSIC.notes.B4, MUSIC.notes.G4, MUSIC.notes.E4,
        MUSIC.notes.C4, MUSIC.notes.E4, MUSIC.notes.G4, null
    ];

    // "Fluttering" arpeggios
    const arpeggio = [
        MUSIC.notes.C5, MUSIC.notes.G4, MUSIC.notes.E4, MUSIC.notes.G4,
        MUSIC.notes.C5, MUSIC.notes.E5, MUSIC.notes.G5, MUSIC.notes.E5,
        MUSIC.notes.A4, MUSIC.notes.C5, MUSIC.notes.E5, MUSIC.notes.C5,
        MUSIC.notes.G4, MUSIC.notes.B4, MUSIC.notes.D5, MUSIC.notes.B4
    ];

    // Light bass line
    const bass = [
        MUSIC.notes.C3, null, MUSIC.notes.G3, null,
        MUSIC.notes.E3, null, MUSIC.notes.C4, null,
        MUSIC.notes.F3, null, MUSIC.notes.D3, null,
        MUSIC.notes.G3, null, MUSIC.notes.E3, null
    ];

    // Play melody with softer square wave
    melody.forEach((note, i) => {
        if (note) {
            const env = createNoteEnvelope(now + i * quarterNote, quarterNote * 0.7);
            env.gain.setValueAtTime(0.2, now + i * quarterNote);
            playNote(note, now + i * quarterNote, quarterNote * 0.7, 'square');
        }
    });

    // Play light arpeggios
    for (let i = 0; i < melody.length/4; i++) {
        arpeggio.forEach((note, j) => {
            const env = createNoteEnvelope(now + (i * 16 + j) * quarterNote/2, quarterNote/3);
            env.gain.setValueAtTime(0.1, now + (i * 16 + j) * quarterNote/2);
            playNote(note, now + (i * 16 + j) * quarterNote/2, quarterNote/3, 'square');
        });
    }

    // Play soft bass
    bass.forEach((note, i) => {
        if (note) {
            const env = createNoteEnvelope(now + i * quarterNote * 2, quarterNote * 1.5);
            env.gain.setValueAtTime(0.15, now + i * quarterNote * 2);
            playNote(note, now + i * quarterNote * 2, quarterNote * 1.5, 'triangle');
        }
    });

    MUSIC.scheduledLoop = setTimeout(() => playMelody(), melody.length * quarterNote * 1000);
}

function startMusic() {
    if (!MUSIC.context) initAudio();
    MUSIC.cleanup(); // Clean up any existing playback
    MUSIC.isPlaying = true;
    playMelody();
}

function stopMusic() {
    MUSIC.isPlaying = false;
    MUSIC.cleanup();
    if (MUSIC.context) {
        MUSIC.context.suspend();
    }
}

let isSoundEnabled = true;

let bird = {
    xPercent: INITIAL_BIRD_X_PERCENT,
    yPercent: INITIAL_BIRD_Y_PERCENT,
    worldWidth: BASE_BIRD_SIZE,
    worldHeight: BASE_BIRD_SIZE,
    alive: true
}; // Bird state
let pipes = []; // Pipes array
let score = 0; // Game score

let wingUp = false;
let lastFlapTime = Date.now();

// Add after other state variables
let restartTextBounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
};

// Chat input form
const chatForm = document.getElementById("chatForm");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const userCountDisplay = document.createElement('div');
document.getElementById('chat').appendChild(userCountDisplay);

// Add at top with other constants
const scoreDisplay = document.getElementById('score');

// Handle chat messages
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value);
    input.value = "";
  }
});

// Handle game restart
document.getElementById("restart").addEventListener("click", () => {
  socket.emit("restart");
  focusInput();
});

// Display chat messages with usernames
socket.on("chat message", (data) => {
  if(data.message != "flap") {
    const item = document.createElement("div");
    item.textContent = `${data.username}: ${data.message}`;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; // Auto-scroll to bottom
  }
});

// Receive game state updates
socket.on("game state", (state) => {
    bird.alive = state.bird.alive;
    bird.xPercent = state.bird.x / GAME_WORLD.width;
    bird.yPercent = state.bird.y / GAME_WORLD.height;
    pipes = state.pipes.map(pipe => ({
        x: pipe.x,
        gapY: pipe.gapY
    }));
    
    // Update visible score
    score = state.score;
    scoreDisplay.textContent = `SCORE: ${score}`;
});

// Update user count
socket.on("user count", (count) => {
  userCountDisplay.textContent = `Users online: ${count}`;
});

// Track the bounds of the "Game Over!" and "Click Restart Game" texts
let gameOverBounds = null;
let restartBounds = null;

function updateWingState() {
    const currentTime = Date.now();
    if (currentTime - lastFlapTime > BIRD_PARTS.FLAP_INTERVAL) {
        wingUp = !wingUp;
        lastFlapTime = currentTime;
    }
}

// Draw the game
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateWingState();

    // Draw bird body
    const screenX = GAME_WORLD.toScreen(bird.xPercent * GAME_WORLD.width);
    const screenY = GAME_WORLD.toScreen(bird.yPercent * GAME_WORLD.height, 'height');
    const screenWidth = Math.floor(bird.worldWidth * currentScale);
    const screenHeight = Math.floor(bird.worldHeight * currentScale);
    
    // Main body
    ctx.fillStyle = bird.alive ? "#ffd33d" : "#666";
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
    
    // Beak
    ctx.fillStyle = "#ff9933";
    const beakWidth = Math.floor(BIRD_PARTS.BEAK_WIDTH * currentScale);
    const beakHeight = Math.floor(BIRD_PARTS.BEAK_HEIGHT * currentScale);
    ctx.fillRect(
        screenX + screenWidth - beakWidth/2,
        screenY + screenHeight/2 - beakHeight/2,
        beakWidth,
        beakHeight
    );
    
    // Wing
    ctx.fillStyle = "#e6b800";
    const wingWidth = Math.floor(BIRD_PARTS.WING_WIDTH * currentScale);
    const wingHeight = Math.floor(BIRD_PARTS.WING_HEIGHT * currentScale);
    const wingY = wingUp ? 
        screenY + screenHeight * BIRD_PARTS.WING_UP_OFFSET : 
        screenY + screenHeight * BIRD_PARTS.WING_DOWN_OFFSET;
    
    ctx.fillRect(
        screenX + screenWidth/4,
        wingY,
        wingWidth,
        wingHeight
    );
    
    // Eye
    ctx.fillStyle = "#000";
    const eyeSize = Math.floor(4 * currentScale);
    ctx.fillRect(
        screenX + screenWidth - eyeSize * 2,
        screenY + screenHeight/3,
        eyeSize,
        eyeSize
    );

    // Draw pipes
    pipes.forEach(pipe => {
      const pipeX = GAME_WORLD.toScreen(pipe.x);
      const gapY = GAME_WORLD.toScreen(pipe.gapY, 'height');
      const pipeWidth = GAME_WORLD.toScreen(BASE_PIPE_WIDTH);
      const gapHeight = GAME_WORLD.toScreen(BASE_GAP_HEIGHT, 'height');
      
      ctx.fillStyle = "#58b368";
      
      // Top pipe - extend from top edge to gap
      const topPipeHeight = gapY - gapHeight/2;
      ctx.fillRect(pipeX, 0, pipeWidth, topPipeHeight);
      
      // Bottom pipe - extend from gap to bottom edge
      const bottomPipeY = gapY + gapHeight/2;
      const bottomPipeHeight = canvas.height - bottomPipeY;
      ctx.fillRect(pipeX, bottomPipeY, pipeWidth, bottomPipeHeight);
      
      // Draw lids
      ctx.fillStyle = "#3c9349";
      const lidWidth = pipeWidth * 1.2;
      const lidHeight = pipeWidth * 0.2;
      const lidOffset = (lidWidth - pipeWidth) / 2;
      
      // Top lid
      ctx.fillRect(pipeX - lidOffset, topPipeHeight - lidHeight, lidWidth, lidHeight);
      
      // Bottom lid
      ctx.fillRect(pipeX - lidOffset, bottomPipeY, lidWidth, lidHeight);
  });

    // Draw game over and restart message
    if (!bird.alive) {
        ctx.fillStyle = "#fff";
        const gameOverSize = Math.floor(24 * currentScale);
        const restartSize = Math.floor(16 * currentScale);
        
        // Game Over text
        ctx.font = `${gameOverSize}px 'Press Start 2P'`;
        const gameOverText = "GAME OVER";
        const gameOverMetrics = ctx.measureText(gameOverText);
        const gameOverX = (canvas.width - gameOverMetrics.width) / 2;
        const gameOverY = canvas.height / 2 - gameOverSize;
        ctx.fillText(gameOverText, gameOverX, gameOverY);
        
        // Press To Restart text
        ctx.font = `${restartSize}px 'Press Start 2P'`;
        const restartText = "PRESS TO RESTART";
        const restartMetrics = ctx.measureText(restartText);
        const restartX = (canvas.width - restartMetrics.width) / 2;
        const restartY = gameOverY + gameOverSize * 1.5;
        
        // Save restart text bounds for click detection
        restartTextBounds = {
            x: restartX,
            y: restartY,
            width: restartMetrics.width,
            height: restartSize
        };
        
        ctx.fillText(restartText, restartX, restartY);
    }

    requestAnimationFrame(drawGame);
}

function updateGameDimensions() {
    const gameContainer = document.getElementById('game');
    const size = Math.min(gameContainer.clientWidth, gameContainer.clientHeight);
    
    canvas.width = size;
    canvas.height = size;
    currentScale = size / GAME_WORLD.width;
}

function checkCollisions() {
    const worldY = bird.yPercent * GAME_WORLD.height;
    
    // Bottom collision using scaled height
    if (worldY + bird.worldHeight >= GAME_WORLD.height) {
        bird.alive = false;
        return;
    }
    
    // Pipe collisions using world coordinates
    pipes.forEach(pipe => {
        const worldBirdX = bird.xPercent * GAME_WORLD.width;
        const worldPipeX = pipe.x;
        
        if (worldBirdX + bird.worldWidth > worldPipeX && 
            worldBirdX < worldPipeX + BASE_PIPE_WIDTH) {
            if (worldY < pipe.gapY - BASE_GAP_HEIGHT/2 || 
                worldY + bird.worldHeight > pipe.gapY + BASE_GAP_HEIGHT/2) {
                bird.alive = false;
            }
        }
    });
}

// Add new click handler function
function handleCanvasClick(event) {
    if (!bird.alive) {
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        if (clickX >= restartTextBounds.x &&
            clickX <= restartTextBounds.x + restartTextBounds.width &&
            clickY >= restartTextBounds.y - restartTextBounds.height &&
            clickY <= restartTextBounds.y) {
            socket.emit("restart");
            focusInput();
        }
    }
}

// Add canvas click listener
canvas.addEventListener('click', handleCanvasClick);

// Add load, resize, and orientation change event listeners
window.addEventListener('load', updateGameDimensions);
window.addEventListener('resize', updateGameDimensions);
window.addEventListener('orientationchange', () => {
    setTimeout(updateGameDimensions, 100);
});

// Add after other event listeners
document.getElementById("flap").addEventListener("click", (e) => {
    e.preventDefault();
    socket.emit("chat message", "flap");
});

// Add sound control functions
function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    document.getElementById('soundIcon').textContent = isSoundEnabled ? '🔊' : '🔇';
    if (!isSoundEnabled) {
        stopMusic();
    } else {
        startMusic();
    }
}

// Update toggle sound handler
document.getElementById('toggleSound').addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    document.getElementById('soundIcon').textContent = isSoundEnabled ? '🔊' : '🔇';
    
    if (isSoundEnabled) {
        if (MUSIC.context) {
            MUSIC.context.resume();
        }
        startMusic();
    } else {
        stopMusic();
    }
});

// Start background music on first interaction
document.addEventListener('click', () => {
    if (isSoundEnabled) startMusic();
}, { once: true });

drawGame();

function focusInput() {
    setTimeout(() => {
        document.getElementById('input').focus();
    }, 100);
}