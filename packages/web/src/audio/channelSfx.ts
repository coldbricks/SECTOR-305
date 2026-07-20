/**
 * Baked channel SFX (ElevenLabs sound-generation) with Web Audio playback
 * and HTMLAudio / synth fallback. Radio vs phone beds never cross-wire.
 */

type SfxId =
  | "radio_key_up"
  | "radio_key_down"
  | "radio_squelch_open"
  | "radio_squelch_tail"
  | "radio_static_bed"
  | "radio_crackle_soft"
  | "phone_line_seize"
  | "phone_line_hangup"
  | "phone_line_bed"
  | "phone_busy_soft";

interface SfxClip {
  id: string;
  file: string;
}

const MANIFEST = "/audio/channel-sfx/manifest.json";

class ChannelSfx {
  private byId = new Map<string, string>();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private bed: HTMLAudioElement | null = null;
  private bedSource: AudioBufferSourceNode | null = null;
  private bedGain: GainNode | null = null;
  private enabled = true;
  private volume = 0.55;
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private oneshots: AudioBufferSourceNode[] = [];

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stopBed();
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
        const res = await fetch(MANIFEST, { cache: "no-cache" });
        if (!res.ok) {
          this.loaded = true;
          return;
        }
        const man = (await res.json()) as { clips?: SfxClip[] };
        for (const c of man.clips ?? []) {
          if (c.id && c.file) this.byId.set(c.id, c.file);
        }
      } catch {
        /* missing pack is fine — synth fallback */
      }
      this.loaded = true;
    })();
    return this.loadPromise;
  }

  has(id: SfxId): boolean {
    return this.byId.has(id);
  }

  /** Decode + cache hot SFX for snappy key-ups. */
  async prewarm(ids?: SfxId[]): Promise<void> {
    await this.ensureLoaded();
    const list =
      ids ??
      ([
        "radio_key_up",
        "radio_key_down",
        "radio_squelch_open",
        "radio_squelch_tail",
        "radio_crackle_soft",
        "radio_static_bed",
        "phone_line_seize",
        "phone_line_hangup",
        "phone_line_bed",
      ] as SfxId[]);
    await Promise.all(list.map((id) => this.decode(id)));
  }

  private async decode(id: SfxId | string): Promise<AudioBuffer | null> {
    const url = this.byId.get(id);
    if (!url) return null;
    const hit = this.bufferCache.get(url);
    if (hit) return hit;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      const ctx = this.ensureCtx();
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          /* autoplay */
        }
      }
      const buf = await ctx.decodeAudioData(raw.slice(0));
      this.bufferCache.set(url, buf);
      return buf;
    } catch {
      return null;
    }
  }

  /** One-shot SFX. Returns true if baked file played. */
  async play(id: SfxId, vol = this.volume): Promise<boolean> {
    if (!this.enabled) return false;
    await this.ensureLoaded();
    const url = this.byId.get(id);
    if (!url) return false;

    // Prefer Web Audio for tight timing with speech chain
    try {
      const buf = await this.decode(id);
      if (buf) {
        const ctx = this.ensureCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = Math.max(0, Math.min(1, vol));
        src.connect(g);
        g.connect(ctx.destination);
        this.oneshots.push(src);
        src.onended = () => {
          this.oneshots = this.oneshots.filter((s) => s !== src);
        };
        src.start();
        return true;
      }
    } catch {
      /* fall through */
    }

    try {
      const a = new Audio(url);
      a.volume = Math.max(0, Math.min(1, vol));
      await a.play();
      return true;
    } catch {
      return false;
    }
  }

  /** Loop soft bed under TX / phone (static or line hiss). */
  async startBed(id: "radio_static_bed" | "phone_line_bed", vol = 0.12) {
    if (!this.enabled) return false;
    await this.ensureLoaded();
    const url = this.byId.get(id);
    if (!url) return false;
    this.stopBed();

    try {
      const buf = await this.decode(id);
      if (buf) {
        const ctx = this.ensureCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const g = ctx.createGain();
        g.gain.value = vol;
        src.connect(g);
        g.connect(ctx.destination);
        src.start();
        this.bedSource = src;
        this.bedGain = g;
        return true;
      }
    } catch {
      /* HTMLAudio fallback */
    }

    try {
      const a = new Audio(url);
      a.loop = true;
      a.volume = vol;
      this.bed = a;
      await a.play();
      return true;
    } catch {
      this.bed = null;
      return false;
    }
  }

  stopBed() {
    if (this.bedSource) {
      try {
        this.bedSource.stop();
      } catch {
        /* ignore */
      }
      this.bedSource = null;
      this.bedGain = null;
    }
    if (this.bed) {
      try {
        this.bed.pause();
        this.bed.src = "";
      } catch {
        /* ignore */
      }
      this.bed = null;
    }
  }
}

export const channelSfx = new ChannelSfx();
