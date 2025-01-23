const CONFIG = {
    GAME: {
        WIDTH: 400,
        HEIGHT: 400,
        PIPE_WIDTH: 50,
        GAP_HEIGHT: 100
    },
    BIRD: {
        WIDTH: 24,
        HEIGHT: 24,
        BEAK_WIDTH: 8,
        BEAK_HEIGHT: 6,
        WING_WIDTH: 12,
        WING_HEIGHT: 8,
        FLAP_INTERVAL: 1000,
        WING_UP_OFFSET: 0.25,
        WING_DOWN_OFFSET: 0.5
    }
};

class Bird {
    constructor() {
        this.xPercent = 0.125;
        this.yPercent = 0.5;
        this.width = CONFIG.BIRD.WIDTH;
        this.height = CONFIG.BIRD.HEIGHT;
        this.alive = true;
        this.wingUp = false;
        this.lastFlapTime = Date.now();
    }

    updateWingState() {
        const currentTime = Date.now();
        if (currentTime - this.lastFlapTime > CONFIG.BIRD.FLAP_INTERVAL) {
            this.wingUp = !this.wingUp;
            this.lastFlapTime = currentTime;
        }
    }
}

class AudioManager {
    constructor() {
        this.context = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.activeNodes = [];
        this.scheduledLoop = null;
        this.enabled = true;
        this.initAudio();
    }

    initAudio() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = 0.1;
        this.gainNode.connect(this.context.destination);
    }

    cleanup() {
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

    createNoteEnvelope(startTime, duration) {
        const envelope = this.context.createGain();
        envelope.connect(this.gainNode);
        envelope.gain.setValueAtTime(0, startTime);
        envelope.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        envelope.gain.linearRampToValueAtTime(0.2, startTime + duration * 0.3);
        envelope.gain.linearRampToValueAtTime(0, startTime + duration);
        return envelope;
    }

    playNote(frequency, startTime, duration, type = 'square') {
        const oscillator = this.context.createOscillator();
        const envelope = this.createNoteEnvelope(startTime, duration);
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        oscillator.connect(envelope);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
        
        this.activeNodes.push(oscillator);
        this.activeNodes.push(envelope);
        
        setTimeout(() => {
            const oscIndex = this.activeNodes.indexOf(oscillator);
            const envIndex = this.activeNodes.indexOf(envelope);
            if (oscIndex > -1) this.activeNodes.splice(oscIndex, 1);
            if (envIndex > -1) this.activeNodes.splice(envIndex, 1);
        }, (startTime + duration) * 1000);
    }

    playMelody() {
        if (!this.isPlaying) return;
        
        const now = this.context.currentTime;
        const quarterNote = 60 / 150;
        
        const melody = [
            329.63, 392.00, 523.25, 659.25,
            587.33, 392.00, 329.63, null,
            523.25, 659.25, 783.99, 659.25,
            523.25, 392.00, null, null,
            659.25, 523.25, 392.00, 329.63,
            392.00, 523.25, null, 659.25,
            587.33, 493.88, 392.00, null,
            440.00, 523.25, 659.25, null,
            783.99, 659.25, 523.25, 392.00,
            440.00, 523.25, 659.25, 523.25,
            587.33, 493.88, 392.00, 329.63,
            261.63, 329.63, 392.00, null
        ];

        const arpeggio = [
            523.25, 392.00, 329.63, 392.00,
            523.25, 659.25, 783.99, 659.25,
            440.00, 523.25, 659.25, 523.25,
            392.00, 493.88, 587.33, 493.88
        ];

        const bass = [
            130.81, null, 196.00, null,
            164.81, null, 261.63, null,
            174.61, null, 146.83, null,
            196.00, null, 164.81, null
        ];

        melody.forEach((note, i) => {
            if (note) {
                const env = this.createNoteEnvelope(now + i * quarterNote, quarterNote * 0.7);
                env.gain.setValueAtTime(0.2, now + i * quarterNote);
                this.playNote(note, now + i * quarterNote, quarterNote * 0.7, 'square');
            }
        });

        for (let i = 0; i < melody.length/4; i++) {
            arpeggio.forEach((note, j) => {
                const env = this.createNoteEnvelope(now + (i * 16 + j) * quarterNote/2, quarterNote/3);
                env.gain.setValueAtTime(0.1, now + (i * 16 + j) * quarterNote/2);
                this.playNote(note, now + (i * 16 + j) * quarterNote/2, quarterNote/3, 'square');
            });
        }

        bass.forEach((note, i) => {
            if (note) {
                const env = this.createNoteEnvelope(now + i * quarterNote * 2, quarterNote * 1.5);
                env.gain.setValueAtTime(0.15, now + i * quarterNote * 2);
                this.playNote(note, now + i * quarterNote * 2, quarterNote * 1.5, 'triangle');
            }
        });

        this.scheduledLoop = setTimeout(() => this.playMelody(), melody.length * quarterNote * 1000);
    }

    startMusic() {
        if (!this.context) this.initAudio();
        this.cleanup();
        this.isPlaying = true;
        this.playMelody();
    }

    stopMusic() {
        this.isPlaying = false;
        this.cleanup();
        if (this.context) {
            this.context.suspend();
        }
    }
}

class Renderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;
        this.currentScale = 1;
    }

    updateDimensions() {
        const gameContainer = document.getElementById('game');
        const size = Math.min(gameContainer.clientWidth, gameContainer.clientHeight);
        this.canvas.width = size;
        this.canvas.height = size;
        this.currentScale = size / CONFIG.GAME.WIDTH;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.game.bird.updateWingState();

        const screenX = this.toScreen(this.game.bird.xPercent * CONFIG.GAME.WIDTH);
        const screenY = this.toScreen(this.game.bird.yPercent * CONFIG.GAME.HEIGHT, 'height');
        const screenWidth = Math.floor(this.game.bird.width * this.currentScale);
        const screenHeight = Math.floor(this.game.bird.height * this.currentScale);
        
        this.ctx.fillStyle = this.game.bird.alive ? "#ffd33d" : "#666";
        this.ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
        
        this.ctx.fillStyle = "#ff9933";
        const beakWidth = Math.floor(CONFIG.BIRD.BEAK_WIDTH * this.currentScale);
        const beakHeight = Math.floor(CONFIG.BIRD.BEAK_HEIGHT * this.currentScale);
        this.ctx.fillRect(
            screenX + screenWidth - beakWidth/2,
            screenY + screenHeight/2 - beakHeight/2,
            beakWidth,
            beakHeight
        );
        
        this.ctx.fillStyle = "#e6b800";
        const wingWidth = Math.floor(CONFIG.BIRD.WING_WIDTH * this.currentScale);
        const wingHeight = Math.floor(CONFIG.BIRD.WING_HEIGHT * this.currentScale);
        const wingY = this.game.bird.wingUp ? 
            screenY + screenHeight * CONFIG.BIRD.WING_UP_OFFSET : 
            screenY + screenHeight * CONFIG.BIRD.WING_DOWN_OFFSET;
        
        this.ctx.fillRect(
            screenX + screenWidth/4,
            wingY,
            wingWidth,
            wingHeight
        );
        
        this.ctx.fillStyle = "#000";
        const eyeSize = Math.floor(4 * this.currentScale);
        this.ctx.fillRect(
            screenX + screenWidth - eyeSize * 2,
            screenY + screenHeight/3,
            eyeSize,
            eyeSize
        );

        this.game.pipes.forEach(pipe => {
            const pipeX = this.toScreen(pipe.x);
            const gapY = this.toScreen(pipe.gapY, 'height');
            const pipeWidth = this.toScreen(CONFIG.GAME.PIPE_WIDTH);
            const gapHeight = this.toScreen(CONFIG.GAME.GAP_HEIGHT, 'height');
            
            this.ctx.fillStyle = "#58b368";
            
            const topPipeHeight = gapY - gapHeight/2;
            this.ctx.fillRect(pipeX, 0, pipeWidth, topPipeHeight);
            
            const bottomPipeY = gapY + gapHeight/2;
            const bottomPipeHeight = this.canvas.height - bottomPipeY;
            this.ctx.fillRect(pipeX, bottomPipeY, pipeWidth, bottomPipeHeight);
            
            this.ctx.fillStyle = "#3c9349";
            const lidWidth = pipeWidth * 1.2;
            const lidHeight = pipeWidth * 0.2;
            const lidOffset = (lidWidth - pipeWidth) / 2;
            
            this.ctx.fillRect(pipeX - lidOffset, topPipeHeight - lidHeight, lidWidth, lidHeight);
            this.ctx.fillRect(pipeX - lidOffset, bottomPipeY, lidWidth, lidHeight);
        });

        if (!this.game.bird.alive) {
            const gameOverSize = Math.floor(24 * this.currentScale);
            const restartSize = Math.floor(16 * this.currentScale);
            const warningSize = Math.floor(restartSize * 0.6);
            
            this.ctx.fillStyle = "#fff";
            this.ctx.font = `${gameOverSize}px 'Press Start 2P'`;
            const gameOverText = "GAME OVER";
            const gameOverMetrics = this.ctx.measureText(gameOverText);
            const gameOverX = (this.canvas.width - gameOverMetrics.width) / 2;
            const gameOverY = this.canvas.height / 2 - gameOverSize;
            this.ctx.fillText(gameOverText, gameOverX, gameOverY);
            
            this.ctx.font = `${restartSize}px 'Press Start 2P'`;
            const restartText = "PRESS TO RESTART";
            const restartMetrics = this.ctx.measureText(restartText);
            const restartX = (this.canvas.width - restartMetrics.width) / 2;
            const restartY = gameOverY + gameOverSize * 1.2;
            this.ctx.fillText(restartText, restartX, restartY);
            
            this.ctx.fillStyle = "#666";
            this.ctx.font = `${warningSize}px 'Press Start 2P'`;
            const warningText = "Unless you have carpal tunnel";
            const warningMetrics = this.ctx.measureText(warningText);
            const warningX = (this.canvas.width - warningMetrics.width) / 2;
            const warningY = restartY + restartSize * 1.2;
            this.ctx.fillText(warningText, warningX, warningY);
            
            this.game.restartTextBounds = {
                x: restartX,
                y: restartY,
                width: restartMetrics.width,
                height: restartSize
            };
        }
    }

    toScreen(coord, dimension = 'width') {
        return coord / CONFIG.GAME[dimension.toUpperCase()] * (dimension === 'width' ? this.canvas.width : this.canvas.height);
    }
}

class Game {
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

const game = new Game();
game.start();