/**
 * Quiet ambient SFX bed for the intro splash.
 * Static + squelch + Floyd BEEP preferred.
 * Spoken radio (Lexa / “fourteen twenty” / ATC) = rare, once-ish per visit.
 */

type Manifest = {
  files: string[];
  volume?: number;
  gapMsMin?: number;
  gapMsMax?: number;
};

function isVoiceClip(url: string): boolean {
  const n = url.toLowerCase();
  // spoken dispatcher / ATC — removed from pack, still blocked if re-added
  // dave-radio is intentional “you on the air” — handled separately
  return (
    (n.includes("disp") || n.includes("atc") || n.includes("lexa")) &&
    !n.includes("dave")
  );
}

/** One-shot personal radio: Dave takes + D tone. */
function isSignatureRadio(url: string): boolean {
  const n = url.toLowerCase();
  if (n.includes("tone-radio") || n.includes("toine")) return true;
  return n.includes("dave") && n.includes("radio");
}

function isDaveRadio(url: string): boolean {
  return isSignatureRadio(url);
}

function isStatic(url: string): boolean {
  return url.toLowerCase().includes("static");
}

function isSquelch(url: string): boolean {
  return url.toLowerCase().includes("squelch");
}

function isBeep(url: string): boolean {
  return url.toLowerCase().includes("dial");
}

class SplashFxBed {
  private files: string[] = [];
  private volume = 0.1;
  private gapMin = 6000;
  private gapMax = 17000;
  private timer: number | null = null;
  private active = false;
  private masterMuted = false;
  private current: HTMLAudioElement | null = null;
  private recent: string[] = [];
  private recentCap = 7;
  private fireCount = 0;
  /** Voice clips already used this splash session — don't re-use. */
  private voiceUsed = new Set<string>();
  private voiceCooldownLeft = 0;
  private loaded = false;

  async load(): Promise<boolean> {
    if (this.loaded && this.files.length) return true;
    try {
      const res = await fetch("/audio/splash-fx/manifest.json", {
        cache: "no-cache",
      });
      if (!res.ok) return false;
      const man = (await res.json()) as Manifest;
      this.files = (man.files ?? []).filter(Boolean);
      if (typeof man.volume === "number") {
        this.volume = Math.min(0.12, man.volume);
      }
      if (typeof man.gapMsMin === "number") this.gapMin = Math.max(5500, man.gapMsMin);
      if (typeof man.gapMsMax === "number") {
        this.gapMax = Math.max(this.gapMin + 4000, man.gapMsMax);
      }
      this.loaded = true;
      this.recentCap = Math.max(5, Math.min(8, this.files.length));
      return this.files.length > 0;
    } catch {
      return false;
    }
  }

  setMasterMuted(m: boolean) {
    this.masterMuted = m;
    if (m) this.stopCurrent();
  }

  async start() {
    const ok = await this.load();
    if (!ok || this.active) return;
    this.active = true;
    this.fireCount = 0;
    this.voiceCooldownLeft = 0;
    this.voiceUsed.clear();
    this.recent = [];
    this.schedule(2800 + Math.random() * 2800);
  }

  stop() {
    this.active = false;
    if (this.timer != null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.stopCurrent(0.4);
  }

  private schedule(delayMs: number) {
    if (!this.active) return;
    if (this.timer != null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      void this.fireOne();
    }, delayMs);
  }

  private weightFor(url: string): number {
    if (isStatic(url)) return 5.5;
    if (isSquelch(url)) return 2.2;
    if (isBeep(url)) return 1.4;
    // Radio roger chirps — quiet room flavor
    if (url.toLowerCase().includes("roger")) return 2.8;
    // You on the air + D tone — cool, not spam
    if (isSignatureRadio(url)) return 1.7;
    if (isVoiceClip(url)) return 0.02;
    return 1;
  }

  private pickUrl(): string {
    // Voice only late, only if unused this session, and cooldown cleared
    const allowVoice =
      this.fireCount >= 7 &&
      this.voiceCooldownLeft <= 0 &&
      this.files.some((f) => isVoiceClip(f) && !this.voiceUsed.has(f));
    // Signature radio (Dave + tone): each once per splash, after static bed settles
    const allowSig =
      this.fireCount >= 2 &&
      this.files.some((f) => isSignatureRadio(f) && !this.voiceUsed.has(f));

    let candidates = this.files.filter((f) => {
      if (this.recent.includes(f)) return false;
      if (isSignatureRadio(f)) {
        if (!allowSig) return false;
        if (this.voiceUsed.has(f)) return false;
        return true;
      }
      if (isVoiceClip(f)) {
        if (!allowVoice) return false;
        if (this.voiceUsed.has(f)) return false;
      }
      return true;
    });

    if (!candidates.length) {
      candidates = this.files.filter(
        (f) =>
          !isVoiceClip(f) && !isSignatureRadio(f) && !this.recent.includes(f)
      );
    }
    if (!candidates.length) {
      candidates = this.files.filter(
        (f) => !isVoiceClip(f) && !isSignatureRadio(f)
      );
    }
    if (!candidates.length) candidates = [...this.files];

    let total = 0;
    const weights = candidates.map((u) => {
      const w = this.weightFor(u);
      total += w;
      return w;
    });
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return candidates[i]!;
    }
    return candidates[candidates.length - 1]!;
  }

  private remember(url: string) {
    this.recent.push(url);
    while (this.recent.length > this.recentCap) this.recent.shift();
    this.fireCount += 1;
    if (this.voiceCooldownLeft > 0) this.voiceCooldownLeft -= 1;

    if (isSignatureRadio(url)) {
      this.voiceUsed.add(url);
      // space Dave / tone takes; static world again between them
      this.voiceCooldownLeft = Math.max(this.voiceCooldownLeft, 8);
    }
    if (isVoiceClip(url)) {
      this.voiceUsed.add(url);
      // Long silence on more talk — static world again
      this.voiceCooldownLeft = Math.max(this.voiceCooldownLeft, 12);
      // Park every other voice file as “used” for a while via recent
      for (const f of this.files) {
        if (isVoiceClip(f) && !this.recent.includes(f)) this.recent.push(f);
      }
      while (this.recent.length > this.recentCap + 4) this.recent.shift();
    }
  }

  private async fireOne() {
    if (!this.active || this.masterMuted || !this.files.length) {
      if (this.active) this.schedule(this.randomGap());
      return;
    }

    const url = this.pickUrl();
    this.remember(url);

    try {
      this.stopCurrent(0.12);
      const a = new Audio(url);
      a.volume = 0;
      a.preload = "auto";
      this.current = a;
      await a.play();
      const mult = isSignatureRadio(url)
        ? 1.15
        : isVoiceClip(url)
          ? 0.55
          : isStatic(url)
            ? 1.05
            : 0.9;
      const peak = this.volume * mult * (0.85 + Math.random() * 0.15);
      this.fade(a, 0, peak, 0.3);
      a.addEventListener(
        "ended",
        () => {
          if (this.current === a) this.current = null;
          if (this.active) this.schedule(this.randomGap());
        },
        { once: true }
      );
      // Voice: shorter cap so it doesn't loop in the ear
      const capMs = isVoiceClip(url)
        ? 3500 + Math.random() * 1500
        : 7000 + Math.random() * 4000;
      window.setTimeout(() => {
        if (this.current === a && !a.ended) {
          this.fade(a, a.volume, 0, 0.35);
          window.setTimeout(() => {
            try {
              a.pause();
            } catch {
              /* ignore */
            }
            if (this.current === a) this.current = null;
            if (this.active) this.schedule(this.randomGap());
          }, 400);
        }
      }, capMs);
    } catch {
      if (this.active) this.schedule(this.randomGap());
    }
  }

  private randomGap(): number {
    // After voice, sit longer in static-world silence
    const extra = this.voiceCooldownLeft > 8 ? 3000 : 0;
    return this.gapMin + Math.random() * (this.gapMax - this.gapMin) + extra;
  }

  private stopCurrent(fadeSec = 0.25) {
    const a = this.current;
    if (!a) return;
    this.current = null;
    this.fade(a, a.volume, 0, fadeSec);
    window.setTimeout(() => {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    }, fadeSec * 1000 + 40);
  }

  private fade(
    a: HTMLAudioElement,
    from: number,
    to: number,
    seconds: number
  ) {
    const t0 = performance.now();
    const ms = Math.max(40, seconds * 1000);
    a.volume = from;
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / ms);
      try {
        a.volume = from + (to - from) * u;
      } catch {
        return;
      }
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

export const splashFxBed = new SplashFxBed();
