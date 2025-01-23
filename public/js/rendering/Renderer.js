import { CONFIG } from '../config/config.js';

export class Renderer {
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