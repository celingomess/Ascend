/* ===================================
   WEB AUDIO API SFX SYNTHESIZER
   Foco & Evolução Pessoal (Acoustic / Zen / Ambient Aesthetics)
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

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        // Toque orgânico amortecido (Woodblock / Gota de água quente)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, ctx.currentTime); // Frequência quente/média

        gain.gain.setValueAtTime(0.025, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

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
        
        // Frequência base de Solfeggio 528Hz (conhecida como frequência da transformação e clareza mental)
        const baseFreq = 528;
        const harmonics = [1, 1.25, 1.5, 2]; // Frequência base, Terça maior, Quinta justa, Oitava

        harmonics.forEach((ratio, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine'; // Ondas senoidais puras para simular tigelas de cristal / sinos tibetanos
            osc.frequency.setValueAtTime(baseFreq * ratio, now);

            // Volume relativo de cada harmônico (harmônicos superiores são mais suaves)
            const volume = 0.035 / (idx + 1);
            gain.gain.setValueAtTime(volume, now);
            
            // Suave decaimento exponencial simulando a ressonância natural de metal/cristal
            gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

            osc.start(now);
            osc.stop(now + 2.0);
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

        // 1. Ressonância de Gongo Zen Profundo (C3 + G3 + C4)
        const gongFreqs = [130.81, 196.00, 261.63];
        gongFreqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            const vol = 0.045 / (idx + 1);
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0); // Ressonância bem longa de fundo

            osc.start(now);
            osc.stop(now + 3.0);
        });

        // 2. Cascata Ascendente de Sinos de Vento Estelares (C5 -> E5 -> G5 -> C6 -> E6 -> G6)
        const chimeNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        chimeNotes.forEach((freq, idx) => {
            const time = now + 0.35 + idx * 0.15; // Inicia um pouco após o gongo profundo

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.02, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

            osc.start(time);
            osc.stop(time + 1.2);
        });
    },

    playCash() {
        if (!this.enabled) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // Primeiro Clink (moeda 1)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now); // Si5
        gain1.gain.setValueAtTime(0.025, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Segundo Clink (moeda 2 - leve atraso e frequência mais alta)
        const delay = 0.06;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, now + delay); // Mi6
        gain2.gain.setValueAtTime(0.02, now + delay);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
        osc2.start(now + delay);
        osc2.stop(now + delay + 0.2);
    }
};

// Auto-inicializa com o primeiro clique na página
document.addEventListener('click', () => {
    AscendSFX.init();
}, { once: true });
