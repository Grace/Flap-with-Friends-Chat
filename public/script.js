const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let bird = { x: 50, y: 200, alive: true }; // Bird state
let pipes = []; // Pipes array
let score = 0;

// Chat input form
const chatForm = document.getElementById("chatForm");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

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

// Display chat messages
socket.on("chat message", (msg) => {
  const item = document.createElement("div");
  item.textContent = msg;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight; // Auto-scroll to bottom
});

// Receive game state updates
socket.on("game state", (state) => {
  bird = state.bird;
  pipes = state.pipes;
  score = state.score;
});

// Draw game
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
    ctx.font = "30px Arial";
    ctx.fillText("Game Over!", 120, 200);
  }

  requestAnimationFrame(drawGame);
}

// Start drawing loop
drawGame();
