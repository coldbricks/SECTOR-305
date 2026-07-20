/**
 * SECTOR 305 console audio — Web Audio synthesis + sparse samples.
 *
 * Doctrine (2026-07-20):
 * - UI pings = quiet synth ticks (not a roger lottery).
 * - One house roger sample only — rare / explicit, never multi-beep spam.
 * - Radio unkey: most closes are silent digital mute; SOME get a very subtle
 *   P25-style end chirp (Phase-1 C4FM / encrypted-burst character from SIGID),
 *   not MDC-1200 AFSK and not analog squelch crash.
 *
 * Research:
 *   https://www.sigidwiki.com/wiki/Project_25_(P25)
 *   https://www.sigidwiki.com/wiki/File:P25_Sound.mp3  (end-of-burst chirp character)
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

/** Single-file house roger (manifest must list at most one). */
const ROGER_FALLBACK = "/audio/roger/roger-1.mp3";
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
  /** Quiet — one house roger only, not a UI spam layer. */
  private notifVol = 0.28;
  private rogerFile: string | null = null;
  private rogerLoaded = false;

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

  /** Full radio path self-test (key · soft rx · forced P25 end chirp). */
  radioTest() {
    if (this.muted) return;
    this.play("radioKey");
    window.setTimeout(() => this.play("radioRx"), 280);
    window.setTimeout(
      () => this.playP25EndChirp({ force: true, field: true }),
      480
    );
    window.setTimeout(() => this.play("ui"), 720);
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
    // UI pings stay on quiet synth — never the roger lottery
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => this.playNow(id, ctx));
      return;
    }
    this.playNow(id, ctx);
  }

  private async loadRogerPack(): Promise<string | null> {
    if (this.rogerLoaded) return this.rogerFile;
    try {
      const res = await fetch(ROGER_MANIFEST, { cache: "no-cache" });
      if (res.ok) {
        const man = (await res.json()) as { files?: string[]; volume?: number };
        // HARD CAP: one house roger only (user order — kill multi-beep spam)
        const first = (man.files ?? []).find(Boolean) ?? null;
        this.rogerFile = first;
        if (typeof man.volume === "number") {
          this.notifVol = Math.min(0.4, Math.max(0.12, man.volume));
        }
      }
    } catch {
      /* ignore */
    }
    if (!this.rogerFile) this.rogerFile = ROGER_FALLBACK;
    this.rogerLoaded = true;
    return this.rogerFile;
  }

  /**
   * Single house roger — rare / explicit only (radio self-test, special moments).
   * Not used for CFS select, map click, coach, soft marks, etc.
   */
  async playRogerNotif(vol = this.notifVol): Promise<void> {
    if (this.muted) return;
    try {
      await this.unlock();
      const url = (await this.loadRogerPack()) ?? ROGER_FALLBACK;
      const a = new Audio(url);
      a.volume = vol;
      a.preload = "auto";
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
      this.playNow("ack", ctx);
    }
  }

  /** @deprecated — maps to soft synth ding, not multi-roger */
  async playBeepBeepNotif(): Promise<void> {
    this.play("ding");
  }

  /**
   * P25-style end-of-transmission chirp — VERY subtle, and only on SOME unkeys.
   *
   * Real Phase-1 C4FM / encrypted bursts (SIGID P25_Sound.mp3 character) often
   * leave a short digital frame edge when the voice channel drops — not a roger
   * beep, not MDC-1200 AFSK (1200/1800 mark-space), not analog squelch crash.
   *
   * Probability (unless force):
   *   console ~18% · field ~32% · emergency ~45%
   * Original synth only — training fiction, not a vendor sample.
   */
  playP25EndChirp(opts?: {
    emergency?: boolean;
    field?: boolean;
    /** Always play (radio self-test). */
    force?: boolean;
  }): boolean {
    if (this.muted) return false;
    const hot = !!opts?.emergency;
    const field = !!opts?.field;
    const p = opts?.force ? 1 : hot ? 0.45 : field ? 0.32 : 0.18;
    if (Math.random() > p) return false;

    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => this.playP25EndChirpNow(ctx, { hot, field }));
      return true;
    }
    this.playP25EndChirpNow(ctx, { hot, field });
    return true;
  }

  /** @deprecated use playP25EndChirp — kept so old call sites don't throw */
  playDigitalUnkeyTail(opts?: { emergency?: boolean; field?: boolean }) {
    this.playP25EndChirp({ ...opts, force: true });
  }

  private playP25EndChirpNow(
    ctx: AudioContext,
    opts: { hot: boolean; field: boolean }
  ) {
    const t = ctx.currentTime;
    const out = this.master(ctx, t);
    // Keep it under the desk — listeners should almost miss it
    const peak =
      (opts.hot ? 0.028 : opts.field ? 0.02 : 0.014) * this.masterGain;

    // 1) Abrupt digital mute floor (P25 closes hard vs analog squelch tail)
    this.p25DigitalBurst(ctx, out, t, 0.028, peak * 0.55, 2100);

    // 2) That little end chirp — ~45–70ms mid-high digital frame edge
    //    (encrypted-burst / last-frame character, not a musical tone)
    const chirpStart = t + 0.018;
    const chirpDur = opts.hot ? 0.07 : 0.052;
    this.p25DigitalBurst(ctx, out, chirpStart, chirpDur, peak, 2600);

    // 3) Tiny residual blip (some scanners catch a last LC/ES frame edge)
    if (opts.field || opts.hot || Math.random() < 0.4) {
      this.tone(ctx, out, {
        freq: 2450 + Math.random() * 400,
        type: "triangle",
        start: chirpStart + chirpDur * 0.55,
        dur: 0.018,
        peak: peak * 0.45,
        attack: 0.001,
        release: 0.01,
      });
    }
  }

  /**
   * Short band-limited digital-sounding burst (C4FM-ish frame edge fiction).
   * Noise through narrow bandpass + stutter — not AFSK dual-tone.
   */
  private p25DigitalBurst(
    ctx: AudioContext,
    dest: AudioNode,
    start: number,
    dur: number,
    peak: number,
    centerHz: number
  ) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, Math.max(0.05, dur + 0.04));
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = centerHz;
    bp.Q.value = 3.2;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4200;
    const g = ctx.createGain();
    const t0 = start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
    // 2–3 digital frame stutters (IMBE-ish chunk edges)
    const steps = 2 + Math.floor(Math.random() * 2);
    for (let i = 1; i < steps; i++) {
      const tt = t0 + (dur * i) / steps;
      const v = peak * (0.25 + Math.random() * 0.55);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), tt);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(hp);
    hp.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
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
      // longer quiet between breaks — channel mostly closed
      const gap = 9000 + Math.random() * 16000;
      this.scheduleSquelchBreak(ctx, gap);
    }, delayMs);
  }

  /** One open-squelch flutter — rare, single burst only (no double-roger tails). */
  private fireSquelchBreak(ctx: AudioContext) {
    const t = ctx.currentTime;
    const out = this.master(ctx, t);
    // primary break — short (60–140ms), quiet
    const dur = 0.06 + Math.random() * 0.08;
    const peak = 0.018 * this.masterGain * (0.7 + Math.random() * 0.4);
    this.crackleBurst(ctx, out, t, dur, peak);
    // almost never a second flutter (was 35% — felt like roger spam)
    if (Math.random() < 0.08) {
      const gap = 0.18 + Math.random() * 0.2;
      this.crackleBurst(ctx, out, t + gap, 0.04, peak * 0.4);
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
        // Single soft desk tick — never double-beep / roger
        this.tone(ctx, out, {
          freq: 740,
          type: "sine",
          start: t,
          dur: 0.055,
          peak: 0.07,
          attack: 0.003,
          release: 0.025,
        });
        break;
      }
      case "alertHi": {
        // urgent double-beep only (P0/P1) — keep short, not a roger cascade
        for (let i = 0; i < 2; i++) {
          this.tone(ctx, out, {
            freq: 880,
            type: "square",
            start: t + i * 0.12,
            dur: 0.06,
            peak: 0.1,
            attack: 0.003,
            release: 0.025,
          });
        }
        break;
      }
      case "assign": {
        this.tone(ctx, out, {
          freq: 660,
          type: "triangle",
          start: t,
          dur: 0.07,
          peak: 0.07,
        });
        break;
      }
      case "ack": {
        // Soft single confirm — not dual-tone + crackle
        this.tone(ctx, out, {
          freq: 620,
          type: "sine",
          start: t,
          dur: 0.06,
          peak: 0.065,
          attack: 0.004,
          release: 0.03,
        });
        break;
      }
      case "tick": {
        this.tone(ctx, out, {
          freq: 980,
          type: "sine",
          start: t,
          dur: 0.03,
          peak: 0.04,
          attack: 0.002,
          release: 0.015,
        });
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
