import {
  SCENARIO_SCORE_TRACKS,
  scenarioScoreAt,
  type ScenarioScoreTrack,
} from "./scenarioScore";

/**
 * Intro shell theme — full song player for the prestige menu.
 *
 * Drop track at:
 *   packages/web/public/audio/shell-theme.mp3  (preferred)
 *
 * Full song (not a tiny loop): play once by default, optional loop.
 * Analyser drives the listening-deck visualizer.
 */

const CANDIDATES = [
  "/audio/shell-theme.mp3", // 192 kbps preferred (full song)
  "/audio/shell-theme.ogg",
  "/audio/shell-theme.wav",
  "/audio/shell-theme.m4a",
];

const MUSIC_MUTE_KEY = "s305.music.muted";
const LOOP_KEY = "s305.music.loop";
const SCORE_CURSOR_KEY = "s305.score.cursor";

export type ShellMusicMeta = {
  title: string;
  artist: string;
  credit: string;
  note: string;
};

/** Liner notes — David Lombardo on guitar. */
export const SHELL_TRACK_META: ShellMusicMeta = {
  title: "Dispatch in Miami",
  artist: "David Lombardo",
  credit: "Lead guitar — David Lombardo",
  note: "Full title track for the prestige shell. Sit with it. The watch can wait.",
};

export type ShellMusicSnapshot = {
  ready: boolean;
  playing: boolean;
  current: number;
  duration: number;
  volume: number;
  loop: boolean;
  muted: boolean;
  ended: boolean;
  mode: MusicMode;
  trackId: string;
  trackTitle: string;
};

type Listener = () => void;
type MusicMode = "title" | "watch" | "debrief";

const TITLE_VOLUME = 0.78;
const WATCH_BED_VOLUME = 0.055;
const DEBRIEF_BED_VOLUME = 0.14;

class ShellMusic {
  private el: HTMLAudioElement | null = null;
  private activeUrl: string | null = null;
  private resolvedUrl: string | null | undefined = undefined;
  private wanted = false;
  private musicMuted = false;
  private masterMuted = false;
  private volume = TITLE_VOLUME;
  private mode: MusicMode = "title";
  private loop = false;
  private ended = false;
  private listeners = new Set<Listener>();
  private playAttempt: Promise<boolean> | null = null;
  private fadeSerial = 0;
  private duckRestoreTimer: number | null = null;
  private trackSwitchTimer: number | null = null;
  private scenarioTrack: ScenarioScoreTrack | null = null;

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private graphReady = false;
  /** Prefer element output until graph is safely wired. */
  private useGraph = false;

  constructor() {
    try {
      // Default: music ON for title splash (don't inherit a stale mute)
      this.musicMuted = localStorage.getItem(MUSIC_MUTE_KEY) === "1";
      this.loop = localStorage.getItem(LOOP_KEY) === "1";
    } catch {
      /* ignore */
    }
  }

  /** Force music unmuted for title sequence. */
  forceUnmute() {
    this.musicMuted = false;
    this.masterMuted = false;
    try {
      localStorage.setItem(MUSIC_MUTE_KEY, "0");
    } catch {
      /* ignore */
    }
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  isMusicMuted(): boolean {
    return this.musicMuted;
  }

  getMeta(): ShellMusicMeta {
    return SHELL_TRACK_META;
  }

  getCurrentTrackTitle(): string {
    return this.scenarioTrack?.title ?? SHELL_TRACK_META.title;
  }

  snapshot(): ShellMusicSnapshot {
    const a = this.el;
    return {
      ready: !!this.resolvedUrl,
      playing: !!(a && !a.paused && !a.ended),
      current: a?.currentTime ?? 0,
      duration: Number.isFinite(a?.duration) ? a!.duration : 0,
      volume: this.volume,
      loop: this.loop,
      muted: this.musicMuted || this.masterMuted,
      ended: this.ended || !!(a?.ended),
      mode: this.mode,
      trackId: this.scenarioTrack?.id ?? "dispatch-in-miami",
      trackTitle: this.getCurrentTrackTitle(),
    };
  }

  setMasterMuted(m: boolean) {
    this.masterMuted = m;
    this.syncPlayback();
    this.emit();
  }

  setMusicMuted(m: boolean) {
    this.musicMuted = m;
    try {
      localStorage.setItem(MUSIC_MUTE_KEY, m ? "1" : "0");
    } catch {
      /* ignore */
    }
    this.syncPlayback();
    this.emit();
  }

  toggleMusicMuted(): boolean {
    this.setMusicMuted(!this.musicMuted);
    return this.musicMuted;
  }

  setLoop(loop: boolean) {
    this.loop = loop;
    if (this.el) this.el.loop = loop;
    try {
      localStorage.setItem(LOOP_KEY, loop ? "1" : "0");
    } catch {
      /* ignore */
    }
    this.emit();
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.el && !this.masterMuted && !this.musicMuted) {
      this.el.volume = this.volume;
    }
    this.emit();
  }

  async enable() {
    this.wanted = true;
    this.ended = false;
    await this.ensureResolved();
    this.syncPlayback();
    this.emit();
  }

  disable() {
    this.disableSlow(1.1);
  }

  /** Cross from the title performance into the next authored scenario score. */
  transitionToWatchBed(seconds = 4.5, seed = 305001) {
    const track = this.rotateScenarioTrack(seed);
    this.mode = "watch";
    this.scenarioTrack = track;
    this.wanted = true;
    this.ended = false;
    this.loop = true;
    this.volume = WATCH_BED_VOLUME;
    if (this.trackSwitchTimer != null) window.clearTimeout(this.trackSwitchTimer);

    const startScenario = () => {
      this.trackSwitchTimer = null;
      const a = this.ensureEl(track.url);
      a.loop = true;
      a.volume = 0;
      if (!this.musicMuted && !this.masterMuted) {
        void a.play().then(() => this.fadeTo(WATCH_BED_VOLUME, Math.max(0.8, seconds - 1.4))).catch(() => {
          this.emit();
        });
      }
      this.emit();
    };

    if (this.el && !this.el.paused) {
      this.fadeTo(0, Math.min(1.4, seconds * 0.4));
      this.trackSwitchTimer = window.setTimeout(startScenario, Math.min(1400, seconds * 400));
    } else {
      startScenario();
    }
    this.emit();
  }

  /** Let the score return gently under the after-action review. */
  transitionToDebriefBed(seconds = 1.8) {
    this.mode = "debrief";
    this.wanted = true;
    this.loop = true;
    this.volume = DEBRIEF_BED_VOLUME;
    if (this.el) {
      this.el.loop = true;
      if (this.el.paused && !this.musicMuted && !this.masterMuted) {
        void this.play();
      } else {
        this.fadeTo(DEBRIEF_BED_VOLUME, seconds);
      }
    } else {
      void this.play();
    }
    this.emit();
  }

  /** Protect dispatch and unit traffic by pushing the bed below radio audio. */
  duckForRadio(holdMs = 1300) {
    if (this.mode === "title" || this.musicMuted || this.masterMuted || !this.el) return;
    if (this.duckRestoreTimer != null) window.clearTimeout(this.duckRestoreTimer);
    this.fadeTo(Math.max(0.008, this.volume * 0.2), 0.1);
    this.duckRestoreTimer = window.setTimeout(() => {
      this.duckRestoreTimer = null;
      this.fadeTo(this.volume, 0.7);
    }, holdMs);
  }

  selectScenarioTrack(trackId: string, fadeSeconds = 0.45): boolean {
    const track = SCENARIO_SCORE_TRACKS.find((candidate) => candidate.id === trackId);
    if (!track) return false;

    this.mode = "watch";
    this.scenarioTrack = track;
    this.wanted = true;
    this.ended = false;
    this.loop = true;
    if (this.volume > DEBRIEF_BED_VOLUME || this.volume <= 0) {
      this.volume = WATCH_BED_VOLUME;
    }

    if (this.trackSwitchTimer != null) window.clearTimeout(this.trackSwitchTimer);
    const switchTrack = () => {
      this.trackSwitchTimer = null;
      const a = this.ensureEl(track.url);
      a.loop = true;
      a.volume = 0;
      if (!this.musicMuted && !this.masterMuted) {
        void a.play().then(() => this.fadeTo(this.volume, fadeSeconds)).catch(() => this.emit());
      }
      this.emit();
    };

    if (this.el && !this.el.paused) {
      this.fadeTo(0, 0.22);
      this.trackSwitchTimer = window.setTimeout(switchTrack, 240);
    } else {
      switchTrack();
    }
    this.emit();
    return true;
  }

  stepScenarioTrack(delta = 1): ScenarioScoreTrack {
    const currentIndex = this.scenarioTrack
      ? SCENARIO_SCORE_TRACKS.findIndex((track) => track.id === this.scenarioTrack?.id)
      : -1;
    const size = SCENARIO_SCORE_TRACKS.length;
    const index = ((currentIndex + delta) % size + size) % size;
    const track = SCENARIO_SCORE_TRACKS[index];
    this.selectScenarioTrack(track.id);
    return track;
  }

  /** Long cinematic fade when leaving splash (BEGIN). */
  disableSlow(seconds = 4.5) {
    this.wanted = false;
    if (this.trackSwitchTimer != null) {
      window.clearTimeout(this.trackSwitchTimer);
      this.trackSwitchTimer = null;
    }
    this.fadeOutAndPause(seconds);
    this.emit();
  }

  hasTrack(): boolean {
    return !!this.resolvedUrl;
  }

  async play(): Promise<boolean> {
    if (this.playAttempt) return this.playAttempt;
    const attempt = this.startPlayback();
    this.playAttempt = attempt;
    try {
      return await attempt;
    } finally {
      if (this.playAttempt === attempt) this.playAttempt = null;
    }
  }

  private async startPlayback(): Promise<boolean> {
    this.wanted = true;
    this.ended = false;
    const url =
      this.mode === "title" || !this.scenarioTrack
        ? await this.ensureResolved()
        : this.scenarioTrack.url;
    if (!url) {
      this.emit();
      return false;
    }
    const a = this.ensureEl(url);
    // Play through the element first so audio is guaranteed audible;
    // wire analyser only after play succeeds (optional).
    a.muted = false;
    a.volume = this.volume;
    try {
      await a.play();
      this.wireGraph(a);
      this.emit();
      return true;
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name?: unknown }).name)
          : "";
      // Browsers reject pre-gesture playback by design. Keep the track armed
      // for ShellSplash's first-interaction retry without polluting test logs.
      if (name !== "NotAllowedError") {
        console.warn("[shellMusic] playback failed", err);
      }
      this.emit();
      return false;
    }
  }

  pause() {
    this.el?.pause();
    this.emit();
  }

  togglePlay(): void {
    if (this.el && !this.el.paused) this.pause();
    else void this.play();
  }

  restart() {
    if (!this.el) {
      void this.play();
      return;
    }
    this.ended = false;
    this.el.currentTime = 0;
    void this.play();
  }

  seek(seconds: number) {
    if (!this.el || !Number.isFinite(this.el.duration)) return;
    this.el.currentTime = Math.min(
      this.el.duration,
      Math.max(0, seconds)
    );
    this.ended = false;
    this.emit();
  }

  /** Frequency data for visualizer. */
  getSpectrum(out: Uint8Array): boolean {
    if (!this.analyser) return false;
    // TS DOM lib is picky about ArrayBuffer vs ArrayBufferLike
    this.analyser.getByteFrequencyData(out as unknown as Uint8Array<ArrayBuffer>);
    return true;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  private wireGraph(a: HTMLAudioElement) {
    if (this.graphReady || !this.useGraph) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AC();
      if (this.audioCtx.state === "suspended") void this.audioCtx.resume();
      // One MediaElementSource per element, ever — only if we opt into graph
      if (!this.source) {
        this.source = this.audioCtx.createMediaElementSource(a);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.82;
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
      this.graphReady = true;
    } catch {
      /* keep element path only */
    }
  }

  private async ensureResolved(): Promise<string | null> {
    if (this.resolvedUrl !== undefined) return this.resolvedUrl;
    for (const url of CANDIDATES) {
      try {
        const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
        if (res.ok) {
          this.resolvedUrl = url;
          return url;
        }
      } catch {
        /* try next */
      }
    }
    for (const url of CANDIDATES) {
      const ok = await this.probeAudio(url);
      if (ok) {
        this.resolvedUrl = url;
        return url;
      }
    }
    this.resolvedUrl = null;
    return null;
  }

  private probeAudio(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const a = new Audio();
      a.preload = "metadata";
      let settled = false;
      const done = (v: boolean) => {
        if (settled) return;
        settled = true;
        a.removeAttribute("src");
        a.load();
        resolve(v);
      };
      a.addEventListener("loadedmetadata", () => done(true), { once: true });
      a.addEventListener("error", () => done(false), { once: true });
      a.src = url;
      window.setTimeout(() => done(false), 2500);
    });
  }

  private ensureEl(url: string): HTMLAudioElement {
    if (this.el && this.activeUrl === url) {
      this.el.loop = this.loop;
      return this.el;
    }
    if (this.el) {
      this.el.pause();
      this.el = null;
      this.graphReady = false;
      this.source = null;
      this.analyser = null;
    }
    const a = new Audio(url);
    this.activeUrl = url;
    a.loop = this.loop;
    a.preload = "auto";
    a.volume = 0;
    a.addEventListener("timeupdate", () => this.emit());
    a.addEventListener("ended", () => {
      this.ended = true;
      this.emit();
    });
    a.addEventListener("play", () => this.emit());
    a.addEventListener("pause", () => this.emit());
    a.addEventListener("loadedmetadata", () => this.emit());
    this.el = a;
    return a;
  }

  private syncPlayback() {
    const hasActiveTrack = !!this.scenarioTrack || !!this.resolvedUrl;
    if (!this.wanted || this.masterMuted || this.musicMuted || !hasActiveTrack) {
      this.fadeOutAndPause(0.35);
      this.emit();
      return;
    }
    void this.play();
  }

  private rotateScenarioTrack(seed: number): ScenarioScoreTrack {
    let cursor = 0;
    try {
      const stored = Number.parseInt(localStorage.getItem(SCORE_CURSOR_KEY) ?? "0", 10);
      if (Number.isFinite(stored) && stored >= 0) cursor = stored;
      localStorage.setItem(SCORE_CURSOR_KEY, String(cursor + 1));
    } catch {
      /* storage is optional */
    }
    return scenarioScoreAt(seed, cursor);
  }

  private fadeTo(target: number, seconds: number) {
    const a = this.el;
    if (!a) return;
    const serial = ++this.fadeSerial;
    const start = a.volume;
    const t0 = performance.now();
    const ms = Math.max(50, seconds * 1000);
    const step = (now: number) => {
      if (!this.el || serial !== this.fadeSerial) return;
      const u = Math.min(1, (now - t0) / ms);
      this.el.volume = start + (target - start) * u;
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private fadeOutAndPause(seconds: number) {
    const a = this.el;
    if (!a) return;
    const serial = ++this.fadeSerial;
    const start = a.volume;
    if (start < 0.01) {
      a.pause();
      return;
    }
    const t0 = performance.now();
    const ms = Math.max(50, seconds * 1000);
    const step = (now: number) => {
      if (!this.el || serial !== this.fadeSerial) return;
      const u = Math.min(1, (now - t0) / ms);
      this.el.volume = start * (1 - u);
      if (u < 1) requestAnimationFrame(step);
      else this.el.pause();
    };
    requestAnimationFrame(step);
  }
}

export const shellMusic = new ShellMusic();
