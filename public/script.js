const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let bird = { x: 50, y: 200, alive: true }; // Bird state
let pipes = []; // Pipes array
let score = 0; // Game score

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
  bird = state.bird;
  pipes = state.pipes;
  score = state.score;
});

// Update user count
socket.on("user count", (count) => {
  userCountDisplay.textContent = `Users online: ${count}`;
});

// Track the bounds of the "Game Over!" and "Click Restart Game" texts
let gameOverBounds = null;
let restartBounds = null;

// Draw game-over message
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw pixelated bird
  ctx.fillStyle = bird.alive ? "#ffd33d" : "#666";
  ctx.fillRect(bird.x, bird.y, 24, 24);
  // Bird eye
  ctx.fillStyle = "#000";
  ctx.fillRect(bird.x + 18, bird.y + 6, 4, 4);

  // Draw pipes with pixel art style
  ctx.fillStyle = "#58b368";
  pipes.forEach((pipe) => {
    // Top pipe
    ctx.fillRect(pipe.x, 0, 50, pipe.gapY - 50);
    // Pipe cap
    ctx.fillStyle = "#3c9349";
    ctx.fillRect(pipe.x - 5, pipe.gapY - 50, 60, 10);
    
    // Bottom pipe
    ctx.fillStyle = "#58b368";
    ctx.fillRect(pipe.x, pipe.gapY + 50, 50, canvas.height - pipe.gapY - 50);
    // Pipe cap
    ctx.fillStyle = "#3c9349";
    ctx.fillRect(pipe.x - 5, pipe.gapY + 50, 60, 10);
  });

  // Draw score
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText(`SCORE: ${score}`, 10, 30);

  // Draw game-over message
  if (!bird.alive) {
    ctx.fillStyle = "#fff";
    ctx.font = "24px 'Press Start 2P'";
    const gameOverText = "GAME OVER";
    const gameOverWidth = ctx.measureText(gameOverText).width;
    const gameOverX = (canvas.width - gameOverWidth) / 2;
    const gameOverY = canvas.height / 2 - 15;
    ctx.fillText(gameOverText, gameOverX, gameOverY);

    ctx.font = "16px 'Press Start 2P'";
    const restartText = "PRESS RESTART";
    const restartWidth = ctx.measureText(restartText).width;
    const restartX = (canvas.width - restartWidth) / 2;
    const restartY = gameOverY + 40;
    ctx.fillText(restartText, restartX, restartY);
  }

  requestAnimationFrame(drawGame);
}

function resizeCanvas() {
    const gameContainer = document.getElementById('game');
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    const size = Math.min(containerWidth, containerHeight);
    
    canvas.width = size;
    canvas.height = size;
    
    // Scale game elements
    const scale = size / 400;
    bird.width = Math.floor(24 * scale);
    bird.height = Math.floor(24 * scale);
    PIPE_WIDTH = Math.floor(50 * scale);
    GAP_HEIGHT = Math.floor(100 * scale);
}

// Add to existing event listeners
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
});

drawGame();
