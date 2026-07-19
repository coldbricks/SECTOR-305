/**
 * Baked channel SFX (ElevenLabs sound-generation) with synth fallback.
 * Radio vs phone use different beds — never cross-wire.
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
  private enabled = true;
  private volume = 0.55;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stopBed();
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

  /** One-shot SFX. Returns true if baked file played. */
  async play(id: SfxId, vol = this.volume): Promise<boolean> {
    if (!this.enabled) return false;
    await this.ensureLoaded();
    const url = this.byId.get(id);
    if (!url) return false;
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
