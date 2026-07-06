/* ===================================
   WEB AUDIO API SFX SYNTHESIZER
   Zero external audio file dependencies!
=================================== */

const AscendSFX = {
    ctx: null,
    enabled: true,

    init() {
        if (!this.ctx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn("Web Audio Context could not start.", e);
            }
        }
    },

    playClick() {
        if (!this.enabled) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        // Resume if suspended (browser security)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.04, ctx.currentTime); // Soft volume
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    },

    playSuccess() {
        if (!this.enabled) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        // Crystal arpeggio progression (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];

        notes.forEach((freq, idx) => {
            const time = now + idx * 0.08;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.08, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

            osc.start(time);
            osc.stop(time + 0.45);
        });
    },

    playLevelUp() {
        if (!this.enabled) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        // Heroic fanfare chords progression (C4 -> F4 -> G4 -> C5/E5/G5/C6 master chord)
        const chords = [
            [261.63, 329.63, 392.00], // C4 major
            [349.23, 440.00, 523.25], // F4 major
            [392.00, 493.88, 587.33], // G4 major
            [523.25, 659.25, 783.99, 1046.50] // C5 major triumphant
        ];

        chords.forEach((chord, chordIdx) => {
            const startTime = now + chordIdx * 0.2;
            const duration = chordIdx === chords.length - 1 ? 0.9 : 0.25;

            chord.forEach((freq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                // Add nice heroic vibrato on the final chord
                if (chordIdx === chords.length - 1) {
                    osc.frequency.linearRampToValueAtTime(freq * 1.012, startTime + 0.25);
                    osc.frequency.linearRampToValueAtTime(freq * 0.988, startTime + 0.5);
                    osc.frequency.linearRampToValueAtTime(freq, startTime + 0.75);
                }

                // Volume fade out
                gain.gain.setValueAtTime(0.06, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc.start(startTime);
                osc.stop(startTime + duration);
            });
        });
    }
};

// Auto-initialize when clicking anywhere on page to comply with browser audio autoplays
document.addEventListener('click', () => {
    AscendSFX.init();
}, { once: true });
