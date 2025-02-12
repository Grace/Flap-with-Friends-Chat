const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Single shared state for all clients
let bird = { x: 50, y: 200, velocity: 0, alive: true }; // Bird state
let pipes = []; // Pipes array
let score = 0; // Game score
let users = 0; // Track the number of connected users

// Function to generate a random username
function generateUsername() {
  const adjectives = [
    "Speedy", "Fluffy", "Mighty", "Clever", 
    "Bouncy", "Silly", "Happy", "Jolly",
    "Swift", "Soaring", "Graceful", "Feathered", 
    "Gliding", "Nimble", "Majestic", "Aerial"
  ];
  const birds = [
    "Falcon", "Chicken", "Owl", "Penguin", 
    "Finch", "Emu", "Duck", "Goose",
    "Sparrow", "Eagle", "Hawk", "Dove", 
    "Raven", "Heron", "Cardinal", "Pigeon"
  ];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomBird = birds[Math.floor(Math.random() * birds.length)];
  return `${randomAdjective} ${randomBird}`;
}

// Initialize the game
function resetGame() {
  bird = { x: 50, y: 200, velocity: 0, alive: true }; // Reset bird position
  pipes = [
    { x: 400, gapY: Math.random() * 150 + 100 },
    { x: 600, gapY: Math.random() * 150 + 100 },
  ]; // Reset pipes
  score = 0; // Reset score
}
resetGame();

// Game loop: Update game state every 50ms. Single game loop for all clients.
setInterval(() => {
  if (!bird.alive) return;

  // Update bird position
  bird.velocity += 1.5; // Gravity
  bird.y += bird.velocity;

  // Update pipes
  pipes.forEach((pipe) => {
    pipe.x -= 5; // Move pipes left
    if (pipe.x < -50) {
      pipe.x = 400; // Reset pipe position
      pipe.gapY = Math.random() * 150 + 100; // Randomize gap
      score++; // Increment score
    }
  });

  // Collision detection
  pipes.forEach((pipe) => {
    const birdWidth = 20;
    const birdHeight = 20;

    if (
      bird.x + birdWidth > pipe.x &&
      bird.x < pipe.x + 50 &&
      (bird.y < pipe.gapY - 50 || bird.y + birdHeight > pipe.gapY + 50)
    ) {
      bird.alive = false; // Collided with pipe
    }
  });

  // Check for ground or ceiling collision
  if (bird.y > 380 || bird.y < 0) {
    bird.alive = false;
  }

  // Emit updated game state to ALL connected clients
  io.emit("game state", { bird, pipes, score });
}, 50);

// Handle WebSocket connections
io.on("connection", (socket) => {
  users++; // Increment user count
  socket.emit("game state", { bird, pipes, score });

  // Generate a random username for the user
  const username = generateUsername();

  // Emit the current user count to all clients
  io.emit("user count", users);

  socket.on("chat message", (msg) => {
    // Emit chat message and username to all clients
    io.emit("chat message", { username, message: msg });

    // Handle 'up' or 'u' for bird control
    if (bird.alive && (msg === "flap" || msg === "up" || msg === "u")) {
      bird.velocity = -10; // Bird flaps upward
    }
  });

  socket.on("restart", () => {
    resetGame();
  });

  socket.on("disconnect", () => {
    users--; // Decrement user count
    console.log("A user disconnected");
    // Emit updated user count to all clients
    io.emit("user count", users);
  });
});

// Serve static files
app.use(express.static("public"));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
