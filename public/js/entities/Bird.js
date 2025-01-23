import { CONFIG } from '../config/config.js';

export class Bird {
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