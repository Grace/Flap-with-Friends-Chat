export class AudioManager {
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