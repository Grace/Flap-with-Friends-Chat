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
  const item = document.createElement("div");
  item.textContent = `${data.username}: ${data.message}`;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight; // Auto-scroll to bottom
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
    score = state.score;
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

// Draw game-over message
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

    // Draw pipes with lids
    pipes.forEach(pipe => {
        const screenPipeX = Math.floor(pipe.x * currentScale);
        const screenPipeY = Math.floor(pipe.gapY * currentScale);
        const screenPipeWidth = Math.floor(BASE_PIPE_WIDTH * currentScale);
        const screenGapHeight = Math.floor(BASE_GAP_HEIGHT * currentScale);
        const lidWidth = Math.floor((BASE_PIPE_WIDTH + 10) * currentScale); // Wider lid
        const lidHeight = Math.floor(10 * currentScale); // Lid height
        const lidOffset = Math.floor(5 * currentScale); // Lid overhang

        // Main pipes
        ctx.fillStyle = "#58b368";
        // Top pipe
        ctx.fillRect(screenPipeX, 0, screenPipeWidth, 
                    screenPipeY - screenGapHeight/2);
        // Bottom pipe
        ctx.fillRect(screenPipeX, screenPipeY + screenGapHeight/2,
                    screenPipeWidth, canvas.height - (screenPipeY + screenGapHeight/2));

        // Pipe lids
        ctx.fillStyle = "#3c9349"; // Darker green for lids
        // Top pipe lid
        ctx.fillRect(screenPipeX - lidOffset, screenPipeY - screenGapHeight/2 - lidHeight,
                    lidWidth, lidHeight);
        // Bottom pipe lid
        ctx.fillRect(screenPipeX - lidOffset, screenPipeY + screenGapHeight/2,
                    lidWidth, lidHeight);
    });

    // Draw score
    ctx.fillStyle = "#fff";
    const fontSize = Math.floor(16 * currentScale);
    ctx.font = `${fontSize}px 'Press Start 2P'`;
    ctx.fillText(`SCORE: ${score}`, 10, fontSize * 2);

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

// Add to existing event listeners
window.addEventListener('load', updateGameDimensions);
window.addEventListener('resize', updateGameDimensions);
window.addEventListener('orientationchange', () => {
    setTimeout(updateGameDimensions, 100);
});

// Add after other event listeners
document.getElementById("flap").addEventListener("click", (e) => {
    e.preventDefault();
    socket.emit("chat message", "up");
});

drawGame();

function focusInput() {
    setTimeout(() => {
        document.getElementById('input').focus();
    }, 100);
}
