export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: { stop: () => void } | null = null;
  muted = false;

  unlock() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.03);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slide = 1,
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    const jitter = 1 + (Math.random() - 0.5) * 0.08;
    osc.frequency.setValueAtTime(freq * jitter, t);
    if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  place() {
    this.tone(210, 0.09, "triangle", 0.08);
    this.noise(0.06, 0.05);
  }
  deny() {
    this.tone(140, 0.08, "square", 0.04, 0.7);
  }
  ui() {
    this.tone(640, 0.04, "sine", 0.04);
  }
  shoot(kind: "sentry" | "burr" | "glaive" | "rime" | "mortar" | "lance" | "stake") {
    if (kind === "sentry") this.tone(480, 0.05, "square", 0.035);
    else if (kind === "burr") {
      this.noise(0.045, 0.045);
      this.tone(360, 0.04, "square", 0.03);
    } else if (kind === "glaive") this.tone(520, 0.07, "triangle", 0.04, 0.75);
    else if (kind === "mortar") {
      this.tone(120, 0.14, "sine", 0.07, 0.6);
      this.noise(0.1, 0.06);
    } else if (kind === "rime") this.tone(860, 0.09, "triangle", 0.04, 1.3);
    else if (kind === "stake") {
      this.tone(170, 0.06, "triangle", 0.05);
      this.noise(0.05, 0.035);
    } else this.tone(1280, 0.045, "sawtooth", 0.025);
  }
  hit() {
    this.noise(0.04, 0.04);
  }
  boom() {
    this.tone(90, 0.22, "sine", 0.09, 0.45);
    this.noise(0.18, 0.08);
  }
  leak() {
    this.tone(110, 0.28, "sine", 0.08, 0.5);
  }
  kill() {
    this.tone(720, 0.06, "sine", 0.03, 1.4);
  }
  wave() {
    this.tone(392, 0.08, "triangle", 0.05);
    window.setTimeout(() => this.tone(523, 0.1, "triangle", 0.05), 90);
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.16, "triangle", 0.06), i * 110);
    });
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.18, "sine", 0.06), i * 130);
    });
  }

  startDrone() {
    this.unlock();
    if (!this.ctx || !this.master || this.drone) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.018;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.value = 82.4;
    o2.frequency.value = 123.47;
    o1.connect(g);
    o2.connect(g);
    g.connect(this.master);
    o1.start();
    o2.start();
    this.drone = {
      stop: () => {
        try {
          o1.stop();
          o2.stop();
        } catch {
          /* already stopped */
        }
        g.disconnect();
      },
    };
  }

  stopDrone() {
    this.drone?.stop();
    this.drone = null;
  }

  dispose() {
    this.stopDrone();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
