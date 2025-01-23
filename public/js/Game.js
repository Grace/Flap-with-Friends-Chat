import { CONFIG } from './config/config.js';
import { Bird } from './entities/Bird.js';
import { AudioManager } from './managers/AudioManager.js';
import { Renderer } from './rendering/Renderer.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.bird = new Bird();
        this.pipes = [];
        this.score = 0;
        this.audio = new AudioManager();
        this.renderer = new Renderer(this.canvas, this);
        this.socket = io();
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('load', () => this.renderer.updateDimensions());
        window.addEventListener('resize', () => this.renderer.updateDimensions());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.renderer.updateDimensions(), 100);
        });

        this.canvas.addEventListener('click', (event) => this.handleCanvasClick(event));

        document.getElementById("flap").addEventListener("click", (e) => {
            e.preventDefault();
            this.socket.emit("chat message", "flap");
        });

        document.getElementById('toggleSound').addEventListener('click', () => {
            this.audio.enabled = !this.audio.enabled;
            document.getElementById('soundIcon').textContent = this.audio.enabled ? '🔊' : '🔇';
            
            if (this.audio.enabled) {
                if (this.audio.context) {
                    this.audio.context.resume();
                }
                this.audio.startMusic();
            } else {
                this.audio.stopMusic();
            }
        });

        document.addEventListener('click', () => {
            if (this.audio.enabled) this.audio.startMusic();
        }, { once: true });

        const chatForm = document.getElementById("chatForm");
        const input = document.getElementById("input");
        const messages = document.getElementById("messages");
        const userCountDisplay = document.createElement('div');
        document.getElementById('chat').appendChild(userCountDisplay);

        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (input.value) {
                this.socket.emit("chat message", input.value);
                input.value = "";
            }
        });

        document.getElementById("restart").addEventListener("click", () => {
            this.socket.emit("restart");
            this.focusInput();
        });

        this.socket.on("chat message", (data) => {
            if(data.message != "flap") {
                const item = document.createElement("div");
                item.textContent = `${data.username}: ${data.message}`;
                messages.appendChild(item);
                messages.scrollTop = messages.scrollHeight;
            }
        });

        this.socket.on("game state", (state) => {
            this.bird.alive = state.bird.alive;
            this.bird.xPercent = state.bird.x / CONFIG.GAME.WIDTH;
            this.bird.yPercent = state.bird.y / CONFIG.GAME.HEIGHT;
            this.pipes = state.pipes.map(pipe => ({
                x: pipe.x,
                gapY: pipe.gapY
            }));
            
            this.score = state.score;
            document.getElementById('score').textContent = `SCORE: ${this.score}`;
        });

        this.socket.on("user count", (count) => {
            userCountDisplay.textContent = `Users online: ${count}`;
        });
    }

    handleCanvasClick(event) {
        if (!this.bird.alive) {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;
            
            if (clickX >= this.restartTextBounds.x &&
                clickX <= this.restartTextBounds.x + this.restartTextBounds.width &&
                clickY >= this.restartTextBounds.y - this.restartTextBounds.height &&
                clickY <= this.restartTextBounds.y) {
                this.socket.emit("restart");
                this.focusInput();
            }
        }
    }

    start() {
        this.renderer.updateDimensions();
        this.gameLoop();
    }

    gameLoop() {
        this.bird.updateWingState();
        this.renderer.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    focusInput() {
        setTimeout(() => {
            document.getElementById('input').focus();
        }, 100);
    }
}