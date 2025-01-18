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

  // Draw bird
  ctx.fillStyle = bird.alive ? "yellow" : "gray";
  ctx.fillRect(bird.x, bird.y, 20, 20);

  // Draw pipes
  ctx.fillStyle = "green";
  pipes.forEach((pipe) => {
    ctx.fillRect(pipe.x, 0, 50, pipe.gapY - 50); // Top pipe
    ctx.fillRect(pipe.x, pipe.gapY + 50, 50, canvas.height - pipe.gapY - 50); // Bottom pipe
  });

  // Draw score
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 10, 30);

  // Draw game-over message
  if (!bird.alive) {
    ctx.fillStyle = "red";

    // Draw "Game Over!" with 30px font
    ctx.font = "30px Arial";
    const gameOverText = "Game Over!";
    const gameOverWidth = ctx.measureText(gameOverText).width;
    const gameOverX = (canvas.width - gameOverWidth) / 2; // Center horizontally
    const gameOverY = canvas.height / 2 - 15; // Position slightly above center
    ctx.fillText(gameOverText, gameOverX, gameOverY);

    // Track bounds for "Game Over!"
    gameOverBounds = { x: gameOverX, y: gameOverY - 30, width: gameOverWidth, height: 30 };

    // Draw "Click Restart Game" with 24px font
    ctx.font = "24px Arial";
    const restartText = "Click Restart Game";
    const restartWidth = ctx.measureText(restartText).width;
    const restartX = (canvas.width - restartWidth) / 2; // Center horizontally
    const restartY = gameOverY + 30; // Position below "Game Over!"
    ctx.fillText(restartText, restartX, restartY);

    // Track bounds for "Click Restart Game"
    restartBounds = { x: restartX, y: restartY - 24, width: restartWidth, height: 24 };
  }

  requestAnimationFrame(drawGame);
}

// Start drawing loop
drawGame();
