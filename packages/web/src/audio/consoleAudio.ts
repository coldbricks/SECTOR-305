/**
 * SECTOR 305 console audio — Web Audio synthesis + sample dings.
 * Session “notification” ding = Floyd-style BEEP BEEP sample (key of D),
 * used the way Grok uses a notification chime (CFS select, soft marks, etc.).
 */

export type SoundId =
  | "boot"
  | "channelUp"
  | "radioKey"
  | "radioCrackle"
  | "radioRx"
  | "ding"
  | "alertHi"
  | "assign"
  | "ack"
  | "clear"
  | "fail"
  | "pass"
  | "tick"
  | "ui"
  | "export"
  | "dtmf"
  | "fireWhistle"
  | "heloPass";

const MUTE_KEY = "s305.audio.muted";
const VOL_KEY = "s305.audio.vol";

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Fallback if roger pack missing. */
const BEEP_BEEP_URL = "/audio/beep-beep.mp3";
const ROGER_MANIFEST = "/audio/roger/manifest.json";

class ConsoleAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGain = 0.42;
  private unlocked = false;
  private ambientOn = false;
  /** Intermittent squelch-break timer (not continuous hiss). */
  private ambientTimer: number | null = null;
  private wantedAmbient = false;
  private notifVol = 0.52;
  private rogerFiles: string[] = [];
  private rogerLoaded = false;
  private lastRoger = -1;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
      const v = Number(localStorage.getItem(VOL_KEY));
      if (Number.isFinite(v) && v > 0 && v <= 1) this.masterGain = v;
    } catch {
      /* ignore */
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  isAmbientOn(): boolean {
    return this.ambientOn && !this.muted;
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (m) this.stopAmbientInternal();
    else if (this.wantedAmbient) this.startAmbient();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Call from a click handler so AudioContext can start. */
  async unlock(): Promise<void> {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* autoplay policy */
      }
    }
    this.unlocked = ctx.state === "running";
  }

  /**
   * Quiet open-channel bed while the watch console is live.
   * Squelch *breaks* only — short static tails, not continuous shhhhh.
   */
  startAmbient() {
    this.wantedAmbient = true;
    if (this.muted || this.ambientOn) return;
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        if (this.wantedAmbient && !this.muted) this.startAmbientNow(ctx);
      });
      return;
    }
    this.startAmbientNow(ctx);
  }

  stopAmbient() {
    this.wantedAmbient = false;
    this.stopAmbientInternal();
  }

  /** Full radio path self-test (key · crackle · rx · ding). */
  radioTest() {
    if (this.muted) return;
    this.play("radioKey");
    window.setTimeout(() => this.play("radioCrackle"), 90);
    window.setTimeout(() => this.play("radioRx"), 320);
    window.setTimeout(() => this.play("ding"), 520);
    window.setTimeout(() => this.play("channelUp"), 700);
  }

  /**
   * Fire station alert sequence:
   * classic dual-tone page (DTMF-style pair) → distant SD-10-ish mechanical whistle.
   */
  fireStationAlert(opts?: { stationId?: string }) {
    if (this.muted) return;
    void opts;
    this.play("dtmf");
    window.setTimeout(() => this.play("dtmf"), 220);
    window.setTimeout(() => this.play("fireWhistle"), 480);
    window.setTimeout(() => this.play("radioCrackle"), 1600);
  }

  play(id: SoundId) {
    if (this.muted) return;
    // Radio-like roger / notification samples for UI pings
    if (id === "ding" || id === "ack" || id === "assign" || id === "tick") {
      void this.playRogerNotif(id === "ack" || id === "assign" ? 0.48 : 0.52);
      return;
    }
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => this.playNow(id, ctx));
      return;
    }
    this.playNow(id, ctx);
  }

  private async loadRogerPack(): Promise<string[]> {
    if (this.rogerLoaded) return this.rogerFiles;
    try {
      const res = await fetch(ROGER_MANIFEST, { cache: "no-cache" });
      if (res.ok) {
        const man = (await res.json()) as { files?: string[]; volume?: number };
        this.rogerFiles = (man.files ?? []).filter(Boolean);
        if (typeof man.volume === "number") this.notifVol = man.volume;
      }
    } catch {
      /* ignore */
    }
    this.rogerLoaded = true;
    return this.rogerFiles;
  }

  private pickRogerUrl(): string {
    const files = this.rogerFiles;
    if (!files.length) return BEEP_BEEP_URL;
    // Prefer short radio chirps (skip longer “ring” samples when possible)
    const shortish = files.filter((f) => {
      const n = f.toLowerCase();
      // keep variety but avoid the longest ring* if we have alternatives
      return !n.includes("ring5a") && !n.includes("ring12");
    });
    const pool = shortish.length >= 4 ? shortish : files;
    let idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idx === this.lastRoger) idx = (idx + 1) % pool.length;
    this.lastRoger = idx;
    return pool[idx]!;
  }

  /**
   * Radio roger / notif chirp — KC2UUM pack + fallbacks.
   * Used like Grok notifications for CFS select, ACK, soft marks, etc.
   */
  async playRogerNotif(vol = this.notifVol): Promise<void> {
    if (this.muted) return;
    try {
      await this.unlock();
      await this.loadRogerPack();
      const url = this.pickRogerUrl();
      const a = new Audio(url);
      a.volume = vol;
      a.preload = "auto";
      await a.play();
    } catch {
      try {
        const a = new Audio(BEEP_BEEP_URL);
        a.volume = vol;
        await a.play();
      } catch {
        const ctx = this.ensureCtx();
        if (ctx.state === "suspended") {
          try {
            await ctx.resume();
          } catch {
            return;
          }
        }
        this.playNow("ding", ctx);
      }
    }
  }

  /** @deprecated alias — session notif is roger pack now */
  async playBeepBeepNotif(): Promise<void> {
    return this.playRogerNotif();
  }

  private startAmbientNow(ctx: AudioContext) {
    if (this.ambientOn) return;
    this.ambientOn = true;
    // first break after a short settle — not a wall of hiss
    this.scheduleSquelchBreak(ctx, 900 + Math.random() * 1400);
  }

  private scheduleSquelchBreak(ctx: AudioContext, delayMs: number) {
    if (this.ambientTimer != null) {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (!this.ambientOn || !this.wantedAmbient || this.muted) return;
    this.ambientTimer = window.setTimeout(() => {
      this.ambientTimer = null;
      if (!this.ambientOn || !this.wantedAmbient || this.muted) return;
      try {
        if (ctx.state === "suspended") {
          void ctx.resume().then(() => {
            if (this.ambientOn && this.wantedAmbient && !this.muted) {
              this.fireSquelchBreak(ctx);
            }
          });
        } else {
          this.fireSquelchBreak(ctx);
        }
      } catch {
        /* ignore */
      }
      // long quiet between breaks — channel mostly closed
      const gap = 4500 + Math.random() * 11000;
      this.scheduleSquelchBreak(ctx, gap);
    }, delayMs);
  }

  /** One open-squelch tail: brief static + optional second tick. */
  private fireSquelchBreak(ctx: AudioContext) {
    const t = ctx.currentTime;
    const out = this.master(ctx, t);
    // primary break — short (80–220ms), not a continuous bed
    const dur = 0.08 + Math.random() * 0.14;
    const peak = 0.028 * this.masterGain * (0.75 + Math.random() * 0.5);
    this.crackleBurst(ctx, out, t, dur, peak);
    // occasional double-break (tail after tail)
    if (Math.random() < 0.35) {
      const gap = 0.12 + Math.random() * 0.22;
      const dur2 = 0.05 + Math.random() * 0.09;
      this.crackleBurst(
        ctx,
        out,
        t + gap,
        dur2,
        peak * (0.45 + Math.random() * 0.35)
      );
    }
  }

  private stopAmbientInternal() {
    this.ambientOn = false;
    if (this.ambientTimer != null) {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  private master(ctx: AudioContext, t0: number): GainNode {
    const g = ctx.createGain();
    g.gain.value = this.masterGain;
    g.connect(ctx.destination);
    // safety fade-out holder
    void t0;
    return g;
  }

  private tone(
    ctx: AudioContext,
    dest: AudioNode,
    opts: {
      freq: number;
      type?: OscillatorType;
      start: number;
      dur: number;
      peak?: number;
      attack?: number;
      release?: number;
      detune?: number;
    }
  ) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.value = opts.freq;
    if (opts.detune) osc.detune.value = opts.detune;
    const peak = opts.peak ?? 0.2;
    const atk = opts.attack ?? 0.008;
    const rel = opts.release ?? 0.08;
    const t0 = opts.start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur - rel);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  private crackleBurst(
    ctx: AudioContext,
    dest: AudioNode,
    start: number,
    dur: number,
    peak = 0.18
  ) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, Math.max(0.05, dur + 0.05));
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800 + Math.random() * 900;
    bp.Q.value = 0.7;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 600;
    const g = ctx.createGain();
    const t0 = start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    // stutter envelope (radio squelch)
    const steps = 4 + Math.floor(Math.random() * 3);
    for (let i = 1; i < steps; i++) {
      const tt = t0 + (dur * i) / steps;
      const v = peak * (0.35 + Math.random() * 0.65);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), tt);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  private playNow(id: SoundId, ctx: AudioContext) {
    const t = ctx.currentTime;
    const out = this.master(ctx, t);

    switch (id) {
      case "boot": {
        // rising link tones
        [440, 554, 659, 880].forEach((f, i) => {
          this.tone(ctx, out, {
            freq: f,
            type: "triangle",
            start: t + i * 0.11,
            dur: 0.16,
            peak: 0.12,
            attack: 0.01,
            release: 0.05,
          });
        });
        this.crackleBurst(ctx, out, t + 0.48, 0.22, 0.1);
        break;
      }
      case "channelUp": {
        this.tone(ctx, out, {
          freq: 980,
          type: "square",
          start: t,
          dur: 0.07,
          peak: 0.08,
        });
        this.tone(ctx, out, {
          freq: 1310,
          type: "square",
          start: t + 0.08,
          dur: 0.1,
          peak: 0.1,
        });
        this.crackleBurst(ctx, out, t + 0.16, 0.28, 0.14);
        break;
      }
      case "radioKey": {
        // PTT open
        this.tone(ctx, out, {
          freq: 210,
          type: "sawtooth",
          start: t,
          dur: 0.045,
          peak: 0.09,
          attack: 0.002,
          release: 0.02,
        });
        this.crackleBurst(ctx, out, t + 0.03, 0.16, 0.16);
        break;
      }
      case "radioCrackle": {
        this.crackleBurst(ctx, out, t, 0.35 + Math.random() * 0.15, 0.15);
        break;
      }
      case "radioRx": {
        this.crackleBurst(ctx, out, t, 0.12, 0.12);
        this.tone(ctx, out, {
          freq: 620,
          type: "sine",
          start: t + 0.05,
          dur: 0.08,
          peak: 0.07,
        });
        this.crackleBurst(ctx, out, t + 0.12, 0.18, 0.1);
        break;
      }
      case "ding": {
        // Synth fallback for BEEP BEEP (D-key dual telephone) if sample fails
        // BEEP
        this.tone(ctx, out, {
          freq: 587.33,
          type: "sine",
          start: t,
          dur: 0.1,
          peak: 0.14,
          attack: 0.004,
          release: 0.03,
        });
        this.tone(ctx, out, {
          freq: 880,
          type: "sine",
          start: t,
          dur: 0.1,
          peak: 0.11,
          attack: 0.004,
          release: 0.03,
        });
        // BEEP
        this.tone(ctx, out, {
          freq: 587.33,
          type: "sine",
          start: t + 0.16,
          dur: 0.1,
          peak: 0.14,
          attack: 0.004,
          release: 0.03,
        });
        this.tone(ctx, out, {
          freq: 880,
          type: "sine",
          start: t + 0.16,
          dur: 0.1,
          peak: 0.11,
          attack: 0.004,
          release: 0.03,
        });
        break;
      }
      case "alertHi": {
        // urgent double-beep
        for (let i = 0; i < 3; i++) {
          this.tone(ctx, out, {
            freq: 880,
            type: "square",
            start: t + i * 0.14,
            dur: 0.08,
            peak: 0.12,
            attack: 0.003,
            release: 0.03,
          });
          this.tone(ctx, out, {
            freq: 1175,
            type: "square",
            start: t + i * 0.14 + 0.04,
            dur: 0.07,
            peak: 0.1,
          });
        }
        break;
      }
      case "assign": {
        this.tone(ctx, out, {
          freq: 660,
          type: "triangle",
          start: t,
          dur: 0.09,
          peak: 0.11,
        });
        this.tone(ctx, out, {
          freq: 990,
          type: "triangle",
          start: t + 0.08,
          dur: 0.12,
          peak: 0.1,
        });
        break;
      }
      case "ack": {
        this.tone(ctx, out, {
          freq: 520,
          type: "sine",
          start: t,
          dur: 0.07,
          peak: 0.1,
        });
        this.tone(ctx, out, {
          freq: 780,
          type: "sine",
          start: t + 0.07,
          dur: 0.1,
          peak: 0.09,
        });
        this.crackleBurst(ctx, out, t + 0.12, 0.1, 0.08);
        break;
      }
      case "clear": {
        this.tone(ctx, out, {
          freq: 440,
          type: "sine",
          start: t,
          dur: 0.12,
          peak: 0.09,
        });
        this.tone(ctx, out, {
          freq: 330,
          type: "sine",
          start: t + 0.1,
          dur: 0.16,
          peak: 0.07,
        });
        break;
      }
      case "fail": {
        this.tone(ctx, out, {
          freq: 220,
          type: "sawtooth",
          start: t,
          dur: 0.35,
          peak: 0.12,
          attack: 0.02,
          release: 0.15,
        });
        this.tone(ctx, out, {
          freq: 165,
          type: "sawtooth",
          start: t + 0.12,
          dur: 0.4,
          peak: 0.1,
        });
        break;
      }
      case "pass": {
        [523, 659, 784, 1046].forEach((f, i) => {
          this.tone(ctx, out, {
            freq: f,
            type: "sine",
            start: t + i * 0.09,
            dur: 0.2,
            peak: 0.1,
          });
        });
        break;
      }
      case "tick": {
        this.tone(ctx, out, {
          freq: 1400,
          type: "sine",
          start: t,
          dur: 0.03,
          peak: 0.04,
          attack: 0.001,
          release: 0.015,
        });
        break;
      }
      case "ui": {
        this.tone(ctx, out, {
          freq: 900,
          type: "sine",
          start: t,
          dur: 0.04,
          peak: 0.05,
          attack: 0.001,
          release: 0.02,
        });
        break;
      }
      case "export": {
        this.tone(ctx, out, {
          freq: 700,
          type: "triangle",
          start: t,
          dur: 0.08,
          peak: 0.08,
        });
        this.tone(ctx, out, {
          freq: 1050,
          type: "triangle",
          start: t + 0.09,
          dur: 0.12,
          peak: 0.08,
        });
        break;
      }
      case "dtmf": {
        // Dual-tone multi-frequency pair (classic page / keypad character)
        // Digit "1" = 697 + 1209; second hit can feel like a two-tone fire page
        const low = 697;
        const high = 1209;
        this.tone(ctx, out, {
          freq: low,
          type: "sine",
          start: t,
          dur: 0.16,
          peak: 0.11,
          attack: 0.004,
          release: 0.04,
        });
        this.tone(ctx, out, {
          freq: high,
          type: "sine",
          start: t,
          dur: 0.16,
          peak: 0.1,
          attack: 0.004,
          release: 0.04,
        });
        // slight second dual pair (two-tone page cadence)
        this.tone(ctx, out, {
          freq: 770,
          type: "sine",
          start: t + 0.18,
          dur: 0.14,
          peak: 0.1,
          attack: 0.004,
          release: 0.04,
        });
        this.tone(ctx, out, {
          freq: 1336,
          type: "sine",
          start: t + 0.18,
          dur: 0.14,
          peak: 0.09,
          attack: 0.004,
          release: 0.04,
        });
        break;
      }
      case "fireWhistle": {
        // Distant SD-10 / mechanical fire-whistle flavor:
        // rising then falling wail, lowpassed, thin, far-field
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 1800;
        lp.Q.value = 0.7;
        const g = ctx.createGain();
        g.gain.value = this.masterGain * 0.55;
        lp.connect(g);
        g.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        // start mid, climb, drop (siren sweep)
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.linearRampToValueAtTime(880, t + 0.55);
        osc.frequency.linearRampToValueAtTime(380, t + 1.15);
        osc.frequency.linearRampToValueAtTime(720, t + 1.55);
        osc.frequency.linearRampToValueAtTime(340, t + 2.1);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
        env.gain.linearRampToValueAtTime(0.07, t + 1.2);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 2.25);

        // distant reverb-ish: delayed quieter copy
        const delay = ctx.createDelay(0.4);
        delay.delayTime.value = 0.09;
        const dg = ctx.createGain();
        dg.gain.value = 0.35;

        osc.connect(env);
        env.connect(lp);
        env.connect(delay);
        delay.connect(dg);
        dg.connect(lp);

        osc.start(t);
        osc.stop(t + 2.35);

        // subtle air hiss under the whistle
        this.crackleBurst(ctx, out, t + 0.1, 0.4, 0.04);
        break;
      }
      case "heloPass": {
        // brief rotor-ish thrum (synthetic, not sample)
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.value = 55;
        lfo.frequency.value = 18;
        lfoG.gain.value = 12;
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        lfo.start(t);
        osc.stop(t + 0.6);
        lfo.stop(t + 0.6);
        break;
      }
      default:
        break;
    }
  }
}

/** Singleton console audio bus. */
export const consoleAudio = new ConsoleAudio();
