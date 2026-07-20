/**
 * SECTOR 305 channel maker — two completely different buses:
 *
 *   RADIO (console / field)  — key-up, RF band EQ, AGC, optional static, squelch
 *   PHONE (911 caller)       — line seize, telephony EQ, soft line noise, hang-up
 *
 * Studio TTS goes in; channel character comes out. Never invents grade law.
 */

import { shellMusic } from "./shellMusic";
import { consoleAudio } from "./consoleAudio";
import { channelSfx } from "./channelSfx";

export type RadioSpeechKind =
  | "DISPATCH"
  | "ACK"
  | "STATUS"
  | "QUERY"
  | "EMERGENCY"
  | "BOLO"
  | "UPDATE"
  | "SYSTEM"
  | "CALLER"
  | "TRAINER"
  | string;

export type ChannelBus = "radio" | "phone" | "trainer";

interface RadioClip {
  id: string;
  file: string;
  voice: string;
  kind: string;
  text: string;
  plainText?: string;
  match: string[];
  scenarioIds: string[];
  channel?: string;
}

interface RadioManifest {
  clips: RadioClip[];
}

const MANIFEST_URL = "/audio/radio-voice/manifest.json";

function normalizeCaption(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 44100;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const k = Math.max(0.1, amount);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

/** White-ish noise (RF hiss / static). */
function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Softer filtered noise seed for phone line (less hashy than RF). */
function phoneLineNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    // simple pink-ish: low-pass random walk blend
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2 + white * 0.15;
  }
  return buf;
}

/** Stable 0–1 from clip id (which TXs get static). */
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

type RadioRole = "console" | "field";

interface ChannelGraph {
  input: GainNode;
  output: GainNode;
  /** RF static / phone line bed */
  noiseGain: GainNode;
  disconnect: () => void;
}

class RadioSpeech {
  private clips: RadioClip[] = [];
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private enabled = true;
  private volume = 0.84;
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private activeSources: AudioBufferSourceNode[] = [];
  private activeDisconnects: Array<() => void> = [];
  private stopTimer: number | null = null;
  /** True while a speech TX is scheduled / running. */
  private txBusy = false;
  private lastClipId: string | null = null;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stop();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isBusy(): boolean {
    return this.txBusy;
  }

  lastPlayedClipId(): string | null {
    return this.lastClipId;
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

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      try {
        const res = await fetch(MANIFEST_URL, { cache: "no-cache" });
        if (!res.ok) {
          this.clips = [];
          this.loaded = true;
          return;
        }
        const man = (await res.json()) as RadioManifest;
        this.clips = Array.isArray(man.clips) ? man.clips : [];
      } catch {
        this.clips = [];
      }
      this.loaded = true;
    })();
    return this.loadPromise;
  }

  findClip(caption: string, kind?: RadioSpeechKind): RadioClip | null {
    const key = normalizeCaption(caption);
    if (!key) return null;
    // Direct id hit (trainer_welcome, disp_ocean_p1_robbery, …)
    const byId = this.clips.find((c) => c.id === caption || normalizeCaption(c.id) === key);
    if (byId) {
      if (!kind) return byId;
      if (byId.kind === kind) return byId;
      if (kind === "TRAINER" && (byId.kind === "TRAINER" || byId.channel === "trainer"))
        return byId;
      if (kind === "CALLER" && (byId.kind === "CALLER" || byId.channel === "phone"))
        return byId;
    }
    let pool = this.clips;
    if (kind === "CALLER") {
      const callers = this.clips.filter(
        (c) => c.kind === "CALLER" || c.channel === "phone"
      );
      if (callers.length) pool = callers;
    } else if (kind === "TRAINER") {
      const trainers = this.clips.filter(
        (c) => c.kind === "TRAINER" || c.channel === "trainer"
      );
      if (trainers.length) pool = trainers;
    }
    const candidates = pool.filter((c) => {
      const texts = [c.text, c.plainText, ...(c.match ?? [])].filter(Boolean) as string[];
      return texts.some((m) => {
        const nm = normalizeCaption(m);
        return nm === key || key.includes(nm) || nm.includes(key);
      });
    });
    if (!candidates.length) return null;
    const exact = candidates.find((c) =>
      (c.match ?? []).some((m) => normalizeCaption(m) === key)
    );
    return exact ?? candidates[0]!;
  }

  stop() {
    for (const s of this.activeSources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.activeSources = [];
    for (const d of this.activeDisconnects) {
      try {
        d();
      } catch {
        /* ignore */
      }
    }
    this.activeDisconnects = [];
    if (this.stopTimer != null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.txBusy = false;
    channelSfx.stopBed();
  }

  private async decodeClip(url: string): Promise<AudioBuffer | null> {
    const hit = this.bufferCache.get(url);
    if (hit) return hit;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      const ctx = this.ensureCtx();
      const buf = await ctx.decodeAudioData(raw.slice(0));
      this.bufferCache.set(url, buf);
      return buf;
    } catch {
      return null;
    }
  }

  /**
   * Decode hot clips so the first TX of a watch is zero-latency.
   * Prefers trainer + responding ACKs + dispatch + callers.
   */
  async prewarmHot(limit = 48): Promise<number> {
    await this.ensureLoaded();
    await consoleAudio.unlock();
    const rank = (c: RadioClip) => {
      if (c.kind === "TRAINER") return 0;
      if (c.kind === "CALLER") return 1;
      if (c.kind === "EMERGENCY") return 2;
      if (c.kind === "DISPATCH") return 3;
      if (/responding/i.test(c.id) || /responding/i.test(c.text || "")) return 4;
      if (c.kind === "ACK") return 5;
      if (c.kind === "BOLO" || c.kind === "UPDATE") return 6;
      return 9;
    };
    const ordered = [...this.clips].sort((a, b) => rank(a) - rank(b));
    const pick = ordered.slice(0, Math.max(8, limit));
    let n = 0;
    // Parallel decode in small batches so we don't stampede the network
    const batch = 6;
    for (let i = 0; i < pick.length; i += batch) {
      const slice = pick.slice(i, i + batch);
      const results = await Promise.all(
        slice.map((c) => this.decodeClip(c.file).then((b) => !!b))
      );
      n += results.filter(Boolean).length;
    }
    void channelSfx.prewarm();
    return n;
  }

  async prewarmClipIds(ids: string[]): Promise<number> {
    await this.ensureLoaded();
    let n = 0;
    for (const id of ids) {
      const clip = this.clips.find((c) => c.id === id);
      if (!clip) continue;
      if (await this.decodeClip(clip.file)) n += 1;
    }
    return n;
  }

  // ---------------------------------------------------------------------------
  // RADIO maker — TX/RX only
  // ---------------------------------------------------------------------------

  /**
   * Multi-stage radio chain:
   * HP → presence peak → notch mud → LP → soft grit → AGC → wet
   * + optional subtle static bed (SOME clips only)
   */
  private buildRadioChannel(
    ctx: AudioContext,
    role: RadioRole,
    withStatic: boolean,
    heat: "normal" | "emergency" = "normal"
  ): ChannelGraph {
    const hot = heat === "emergency";
    const input = ctx.createGain();
    input.gain.value = 1;

    // Kill boom / room rumble
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = role === "field" ? 360 : 280;
    hp.Q.value = 0.75;

    // Speech presence (callsigns cut the score bed)
    const presence = ctx.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = role === "field" ? 1850 : 1650;
    presence.Q.value = 1.05;
    presence.gain.value =
      (role === "field" ? 4.0 : 2.6) + (hot ? 1.4 : 0);

    // Scoop a little boxiness
    const scoop = ctx.createBiquadFilter();
    scoop.type = "peaking";
    scoop.frequency.value = 520;
    scoop.Q.value = 0.9;
    scoop.gain.value = role === "field" ? -2.8 : -1.6;

    // RF ceiling — no studio air
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = role === "field" ? 2700 : 3300;
    lp.Q.value = 0.9;

    // Darken residual top
    const shelf = ctx.createBiquadFilter();
    shelf.type = "highshelf";
    shelf.frequency.value = 2200;
    shelf.gain.value = role === "field" ? -4.5 : -2.8;

    const grit = ctx.createWaveShaper();
    grit.curve = makeDistortionCurve(
      (role === "field" ? 14 : 7) + (hot ? 4 : 0)
    );
    grit.oversample = "2x";

    // AGC crush — radio limiter feel
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = role === "field" ? -30 : -22;
    comp.knee.value = hot ? 6 : 10;
    comp.ratio.value = (role === "field" ? 12 : 7) + (hot ? 2 : 0);
    comp.attack.value = 0.0025;
    comp.release.value = 0.11;

    const wet = ctx.createGain();
    wet.gain.value =
      this.volume * (role === "field" ? 0.9 : 1.0) * (hot ? 1.06 : 1.0);

    // Static bus — only if this TX rolled static
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;

    const nHp = ctx.createBiquadFilter();
    nHp.type = "highpass";
    nHp.frequency.value = 900;
    nHp.Q.value = 0.6;

    const nLp = ctx.createBiquadFilter();
    nLp.type = "lowpass";
    nLp.frequency.value = role === "field" ? 3800 : 4200;
    nLp.Q.value = 0.5;

    const out = ctx.createGain();
    out.gain.value = 1;

    input
      .connect(hp)
      .connect(presence)
      .connect(scoop)
      .connect(lp)
      .connect(shelf)
      .connect(grit)
      .connect(comp)
      .connect(wet)
      .connect(out);

    if (withStatic) {
      noiseGain.connect(nHp).connect(nLp).connect(out);
    }

    out.connect(ctx.destination);

    return {
      input,
      output: out,
      noiseGain,
      disconnect: () => {
        try {
          out.disconnect();
        } catch {
          /* ignore */
        }
      },
    };
  }

  /** Subtle static on SOME radio only — field more often than console. */
  private shouldHaveRadioStatic(clipId: string, role: RadioRole): boolean {
    const r = hash01(clipId + ":static");
    // ~22% console, ~38% field — never majority
    return role === "field" ? r < 0.38 : r < 0.22;
  }

  private scheduleRadioSquelch(
    noiseGain: GainNode,
    t0: number,
    tEnd: number,
    role: RadioRole,
    withStatic: boolean
  ) {
    // Open key: short burst even if no bed static
    const openPeak = role === "field" ? 0.038 : 0.022;
    noiseGain.gain.setValueAtTime(0.0001, t0 - 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(openPeak, t0 - 0.005);

    if (withStatic) {
      // Quiet bed under speech — subtle, not a storm
      const bed = role === "field" ? 0.011 : 0.0065;
      noiseGain.gain.exponentialRampToValueAtTime(bed, t0 + 0.07);
      // occasional mid-TX flutter
      if (hash01(String(t0)) > 0.55 && tEnd - t0 > 1.2) {
        const mid = t0 + (tEnd - t0) * 0.45;
        noiseGain.gain.setValueAtTime(bed, mid);
        noiseGain.gain.linearRampToValueAtTime(bed * 2.4, mid + 0.04);
        noiseGain.gain.linearRampToValueAtTime(bed, mid + 0.12);
      }
    } else {
      // No bed — drop open burst immediately so chain is clean
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    }

    // Unkey tail
    const tail = withStatic ? 0.035 : 0.022;
    noiseGain.gain.setValueAtTime(
      Math.max(0.0001, withStatic ? (role === "field" ? 0.011 : 0.0065) : 0.0001),
      tEnd - 0.04
    );
    noiseGain.gain.exponentialRampToValueAtTime(tail, tEnd - 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, tEnd + 0.07);
  }

  // ---------------------------------------------------------------------------
  // TRAINER maker — academy coach (clean headset, never RF)
  // ---------------------------------------------------------------------------

  /**
   * Studio-adjacent coach path: gentle presence, soft limiter, zero grit/static.
   * Dave must feel like a training officer on your earpiece — not a field unit.
   */
  private buildTrainerChannel(ctx: AudioContext): ChannelGraph {
    const input = ctx.createGain();
    input.gain.value = 1;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 90;
    hp.Q.value = 0.7;

    const presence = ctx.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 2800;
    presence.Q.value = 0.9;
    presence.gain.value = 1.8;

    const air = ctx.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 6000;
    air.gain.value = 1.2;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 20;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.008;
    comp.release.value = 0.22;

    const wet = ctx.createGain();
    wet.gain.value = this.volume * 0.92;

    // noiseGain present but always silent (API parity with other chains)
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;

    const out = ctx.createGain();
    out.gain.value = 1;

    input.connect(hp).connect(presence).connect(air).connect(comp).connect(wet).connect(out);
    out.connect(ctx.destination);

    return {
      input,
      output: out,
      noiseGain,
      disconnect: () => {
        try {
          out.disconnect();
        } catch {
          /* ignore */
        }
      },
    };
  }

  // ---------------------------------------------------------------------------
  // PHONE maker — 911 handset only (NOT radio)
  // ---------------------------------------------------------------------------

  /**
   * Telephony path: no key-up, no squelch, no RF static.
   * Narrow band + line hum character + soft continuous line noise.
   */
  private buildPhoneChannel(ctx: AudioContext): ChannelGraph {
    const input = ctx.createGain();
    input.gain.value = 1.05;

    // Classic handset band (~300–3400-ish, a bit tighter for "cell to PSAP")
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 320;
    hp.Q.value = 0.65;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3100;
    lp.Q.value = 0.75;

    // Nasal phone mid push
    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1450;
    mid.Q.value = 1.25;
    mid.gain.value = 5.0;

    // Kill remaining air
    const shelf = ctx.createBiquadFilter();
    shelf.type = "highshelf";
    shelf.frequency.value = 2500;
    shelf.gain.value = -7;

    // Mild codec-ish crush (not radio grit)
    const grit = ctx.createWaveShaper();
    grit.curve = makeDistortionCurve(5.5);
    grit.oversample = "2x";

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.knee.value = 18;
    comp.ratio.value = 5.5;
    comp.attack.value = 0.008;
    comp.release.value = 0.18;

    const wet = ctx.createGain();
    wet.gain.value = this.volume * 0.98;

    // Soft continuous line noise (not RF hash)
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;

    const nHp = ctx.createBiquadFilter();
    nHp.type = "highpass";
    nHp.frequency.value = 280;

    const nLp = ctx.createBiquadFilter();
    nLp.type = "lowpass";
    nLp.frequency.value = 2800;

    const out = ctx.createGain();
    out.gain.value = 1;

    input
      .connect(hp)
      .connect(lp)
      .connect(mid)
      .connect(shelf)
      .connect(grit)
      .connect(comp)
      .connect(wet)
      .connect(out);

    noiseGain.connect(nHp).connect(nLp).connect(out);
    out.connect(ctx.destination);

    return {
      input,
      output: out,
      noiseGain,
      disconnect: () => {
        try {
          out.disconnect();
        } catch {
          /* ignore */
        }
      },
    };
  }

  private schedulePhoneLine(
    noiseGain: GainNode,
    t0: number,
    tEnd: number
  ) {
    // Soft seize — no radio open-squelch pop
    noiseGain.gain.setValueAtTime(0.0001, t0 - 0.05);
    noiseGain.gain.linearRampToValueAtTime(0.008, t0);
    // Steady faint line bed under the whole call
    noiseGain.gain.linearRampToValueAtTime(0.0055, t0 + 0.12);
    // Hang-up: noise drops clean (phone dead)
    noiseGain.gain.setValueAtTime(0.0055, tEnd - 0.05);
    noiseGain.gain.linearRampToValueAtTime(0.0001, tEnd + 0.08);
  }

  private async playPhonePickupFx() {
    // Deliberately NOT radio — baked phone seize if present
    await channelSfx.ensureLoaded();
    const ok = await channelSfx.play("phone_line_seize", 0.42);
    if (!ok) {
      consoleAudio.play("ui");
      window.setTimeout(() => consoleAudio.play("tick"), 40);
    }
  }

  private async playPhoneHangupFx() {
    const ok = await channelSfx.play("phone_line_hangup", 0.35);
    if (!ok) consoleAudio.play("tick");
  }

  private async playRadioKeyFx(role: RadioRole, emergency = false) {
    await channelSfx.ensureLoaded();
    // P25 key-up is soft open — not analog key + crackle + squelch stack
    const keyVol = emergency
      ? role === "field"
        ? 0.42
        : 0.36
      : role === "field"
        ? 0.32
        : 0.26;
    const keyed = await channelSfx.play("radio_key_up", keyVol);
    if (!keyed) consoleAudio.play("radioKey");
    // Rare soft grit only on field/emergency (not every TX)
    if (emergency || (role === "field" && Math.random() < 0.2)) {
      window.setTimeout(() => {
        void channelSfx.play("radio_crackle_soft", emergency ? 0.18 : 0.12);
      }, 40);
    }
  }

  /**
   * Unkey: digital mute by default; SOME get a very subtle P25 end chirp
   * (SIGID P25_Sound.mp3 character). No analog squelch-tail every TX.
   */
  private async playRadioUnkeyFx(role: RadioRole, emergency = false) {
    const chirped = consoleAudio.playP25EndChirp({
      field: role === "field",
      emergency,
    });
    // If no end chirp this time, barely-there key-down only (digital mute feel)
    if (!chirped) {
      await channelSfx.play("radio_key_down", 0.12);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async playCallerFromNote(
    noteText: string
  ): Promise<{ played: boolean; clipId: string | null; durationMs: number }> {
    return this.playCaption({
      caption: noteText,
      kind: "CALLER",
      direction: "phone",
    });
  }

  /** Academy coach — Dave trainer voice, clean (not radio, not 911). */
  async playTrainer(
    text: string
  ): Promise<{ played: boolean; clipId: string | null; durationMs: number }> {
    return this.playCaption({
      caption: text,
      kind: "TRAINER",
      direction: "trainer",
    });
  }

  /** Play a known clip by id (e.g. trainer_welcome). */
  async playClipById(
    clipId: string,
    opts?: { kind?: RadioSpeechKind; direction?: "dispatch_tx" | "unit_tx" | "phone" | "trainer" }
  ): Promise<{ played: boolean; clipId: string | null; durationMs: number }> {
    await this.ensureLoaded();
    const clip = this.clips.find((c) => c.id === clipId);
    if (!clip) {
      return { played: false, clipId: null, durationMs: 0 };
    }
    // Caption = clip id so findClip hits the direct-id path
    return this.playCaption({
      caption: clipId,
      kind: opts?.kind ?? (clip.kind as RadioSpeechKind) ?? "TRAINER",
      direction:
        opts?.direction ??
        (clip.channel === "phone"
          ? "phone"
          : clip.channel === "trainer" || clip.kind === "TRAINER"
            ? "trainer"
            : "dispatch_tx"),
    });
  }

  async playCaption(opts: {
    caption: string;
    kind?: RadioSpeechKind;
    direction?: "dispatch_tx" | "unit_tx" | "phone" | "trainer";
  }): Promise<{ played: boolean; clipId: string | null; durationMs: number }> {
    if (!this.enabled || consoleAudio.isMuted()) {
      return { played: false, clipId: null, durationMs: 0 };
    }

    await this.ensureLoaded();
    await consoleAudio.unlock();

    const clip = this.findClip(opts.caption, opts.kind);
    const kind = (opts.kind ?? clip?.kind ?? "") as RadioSpeechKind;
    const isTrainer =
      opts.kind === "TRAINER" ||
      opts.direction === "trainer" ||
      clip?.kind === "TRAINER" ||
      clip?.channel === "trainer";
    const isPhone =
      !isTrainer &&
      (opts.kind === "CALLER" ||
        opts.direction === "phone" ||
        clip?.kind === "CALLER" ||
        clip?.channel === "phone");
    const isUnit =
      !isPhone &&
      !isTrainer &&
      (opts.direction === "unit_tx" ||
        opts.kind === "ACK" ||
        opts.kind === "STATUS");
    const isEmergency =
      kind === "EMERGENCY" ||
      kind === "BOLO" ||
      /emergency|mayday|shots? fired|officer down/i.test(
        opts.caption + " " + (clip?.text ?? "")
      );
    const radioRole: RadioRole = isUnit ? "field" : "console";
    const bus: ChannelBus = isTrainer
      ? "trainer"
      : isPhone
        ? "phone"
        : "radio";

    // Step-on: cut prior TX hard so concurrent traffic still feels like radio
    const steppedOn = this.txBusy;
    if (steppedOn && bus === "radio") {
      void channelSfx.play("radio_crackle_soft", 0.35);
    }

    if (bus === "radio") {
      void this.playRadioKeyFx(radioRole, isEmergency);
      if (isEmergency) {
        window.setTimeout(() => consoleAudio.play("alertHi"), 40);
      }
    } else if (bus === "phone") {
      void this.playPhonePickupFx();
    } else {
      // Trainer: soft UI only — clear headset, not RF
      consoleAudio.play("ui");
    }

    // Duck depth: emergency punches through, trainer is polite, phone is mid
    const duckDepth = isEmergency
      ? 0.06
      : bus === "trainer"
        ? 0.35
        : bus === "phone"
          ? 0.18
          : isUnit
            ? 0.16
            : 0.12;

    if (!clip) {
      if (bus === "radio") {
        window.setTimeout(
          () => consoleAudio.play(isUnit ? "ack" : "assign"),
          200
        );
      }
      shellMusic.duckForRadio(isUnit ? 1300 : 1700, duckDepth);
      return { played: false, clipId: null, durationMs: isUnit ? 1300 : 1700 };
    }

    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return { played: false, clipId: clip.id, durationMs: 0 };
      }
    }

    const buf = await this.decodeClip(clip.file);
    if (!buf) {
      if (bus === "radio") {
        window.setTimeout(
          () => consoleAudio.play(isUnit ? "ack" : "assign"),
          180
        );
      }
      return { played: false, clipId: clip.id, durationMs: 0 };
    }

    this.stop();
    this.txBusy = true;
    this.lastClipId = clip.id;

    const withStatic =
      bus === "radio" &&
      (isEmergency || this.shouldHaveRadioStatic(clip.id, radioRole));
    const chain =
      bus === "phone"
        ? this.buildPhoneChannel(ctx)
        : bus === "trainer"
          ? this.buildTrainerChannel(ctx)
          : this.buildRadioChannel(
              ctx,
              radioRole,
              withStatic,
              isEmergency ? "emergency" : "normal"
            );

    this.activeDisconnects.push(chain.disconnect);

    // Soft speech envelope — no hard digital edge on key-up
    const env = ctx.createGain();
    env.gain.value = 0.0001;
    const speech = ctx.createBufferSource();
    speech.buffer = buf;
    speech.connect(env);
    env.connect(chain.input);
    this.activeSources.push(speech);

    const hiss = ctx.createBufferSource();
    hiss.buffer =
      bus === "phone"
        ? phoneLineNoiseBuffer(ctx, 1.4)
        : bus === "trainer"
          ? noiseBuffer(ctx, 0.4)
          : noiseBuffer(ctx, 1.2);
    hiss.loop = true;
    hiss.connect(chain.noiseGain);
    this.activeSources.push(hiss);

    const leadIn =
      bus === "phone" ? 0.06 : bus === "trainer" ? 0.04 : 0.09;
    const t0 = ctx.currentTime + leadIn;
    const dur = buf.duration;
    const tEnd = t0 + dur;

    // Attack / release on speech
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(1, t0 + 0.018);
    env.gain.setValueAtTime(1, Math.max(t0 + 0.02, tEnd - 0.04));
    env.gain.exponentialRampToValueAtTime(0.0001, tEnd + 0.03);

    if (bus === "phone") {
      this.schedulePhoneLine(chain.noiseGain, t0, tEnd);
      void channelSfx.startBed("phone_line_bed", 0.08);
    } else if (bus === "trainer") {
      chain.noiseGain.gain.setValueAtTime(0.0001, t0);
    } else {
      this.scheduleRadioSquelch(
        chain.noiseGain,
        t0,
        tEnd,
        radioRole,
        withStatic
      );
      if (withStatic) {
        void channelSfx.startBed(
          "radio_static_bed",
          isEmergency
            ? 0.12
            : radioRole === "field"
              ? 0.1
              : 0.06
        );
      }
    }

    const duckMs = Math.ceil(
      (leadIn + dur + (bus === "phone" ? 0.18 : bus === "trainer" ? 0.12 : 0.24)) *
        1000
    );
    shellMusic.duckForRadio(Math.max(1200, duckMs), duckDepth);

    try {
      if (bus !== "trainer") {
        hiss.start(t0 - (bus === "phone" ? 0.04 : 0.05));
        hiss.stop(tEnd + (bus === "phone" ? 0.1 : 0.12));
      }
      speech.start(t0);
      speech.stop(tEnd + 0.05);
    } catch {
      this.txBusy = false;
      channelSfx.stopBed();
      return { played: false, clipId: clip.id, durationMs: 0 };
    }

    speech.onended = () => {
      this.activeSources = this.activeSources.filter(
        (s) => s !== speech && s !== hiss
      );
      channelSfx.stopBed();
      this.txBusy = false;
      if (bus === "phone") void this.playPhoneHangupFx();
      else if (bus === "radio")
        void this.playRadioUnkeyFx(radioRole, isEmergency);
    };

    this.stopTimer = window.setTimeout(() => {
      this.activeSources = this.activeSources.filter(
        (s) => s !== speech && s !== hiss
      );
      channelSfx.stopBed();
      this.txBusy = false;
      for (const d of this.activeDisconnects) {
        try {
          d();
        } catch {
          /* ignore */
        }
      }
      this.activeDisconnects = [];
    }, duckMs + 250);

    return {
      played: true,
      clipId: clip.id,
      durationMs: Math.round(dur * 1000),
    };
  }

  clipCount(): number {
    return this.clips.length;
  }
}

export const radioSpeech = new RadioSpeech();
