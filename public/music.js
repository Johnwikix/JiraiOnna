export const tracks = {
  night: { title: '未发送的夜', mood: '深夜 · 轻钢琴与氛围和声', file: 'night.wav' },
  shift: { title: '末班车前的杯盏', mood: '居酒屋 · 轻爵士', file: 'shift.wav' },
  tension: { title: '门外，四秒', mood: '悬疑 · 低音与疏落钟声', file: 'tension.wav' },
  rin: { title: '紫色的休止符', mood: '凛 · 冷色八音盒', file: 'rin.wav' },
  nana: { title: '南风的快门', mood: '七濑 · 温暖拨弦', file: 'nana.wav' },
  shiori: { title: '书页之间', mood: '栞 · 柔和钢琴', file: 'shiori.wav' },
  qing: { title: '一个小时的距离', mood: '晚晴 · 克制的圆舞曲', file: 'qing.wav' },
  dawn: { title: '四点零一分', mood: '终章 · 逐渐明亮的和弦', file: 'dawn.wav' }
};

export function trackFor(node) {
  if (node.music && tracks[node.music]) return node.music;
  if (node.bg === 'door' || node.ending === 'rin-bad') return 'tension';
  if (node.ending === 'dawn' || node.bg === 'dawn' && !node.route) return 'dawn';
  if (node.route) return node.route === 'qing' ? 'qing' : node.route;
  if (node.bg === 'izakaya') return 'shift';
  return 'night';
}

export class MusicPlayer {
  constructor(onError) { this.players = []; this.current = null; this.volume = .35; this.enabled = false; this.onError = onError; this.fade = null; }
  async play(key, userGesture = false) {
    if (!tracks[key]) return;
    this.desired = key;
    if (!this.enabled) return;
    if (this.current?.key === key) {
      if (this.current.audio.paused && userGesture) this.current.audio.play().catch(() => this.onError?.('点击右上角音乐按钮后播放配乐。'));
      return;
    }
    clearInterval(this.fade);
    // Retire any earlier crossfade before starting another one.
    this.players.filter(p => p !== this.current).forEach(p => { p.audio.pause(); p.audio.removeAttribute('src'); p.audio.load(); });
    this.players = this.current ? [this.current] : [];
    const audio = new Audio(`audio/${tracks[key].file}`);
    audio.loop = true; audio.volume = 0;
    const next = { key, audio }; const old = this.current;
    this.players.push(next); this.current = next;
    try { await audio.play(); } catch {
      if (this.current === next) this.current = old;
      audio.pause(); this.players = this.players.filter(p => p !== next);
      this.onError?.('配乐暂未播放，点击音乐按钮重试。'); return;
    }
    if (this.current !== next || !this.enabled) { audio.pause(); return; }
    const start = performance.now(), oldVolume = old?.audio.volume || 0;
    this.fade = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / 1200);
      audio.volume = this.volume * t;
      if (old) old.audio.volume = oldVolume * (1 - t);
      if (t === 1) { clearInterval(this.fade); if (old) { old.audio.pause(); old.audio.removeAttribute('src'); old.audio.load(); } this.players = [next]; }
    }, 30);
  }
  setVolume(volume) { this.volume = volume; if (this.current && !this.fade) this.current.audio.volume = volume; else if (this.current) this.current.audio.volume = volume; }
  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) { clearInterval(this.fade); this.players.forEach(p => p.audio.pause()); }
    else if (this.current?.key === this.desired) { this.current.audio.volume = this.volume; this.current.audio.play().catch(() => this.onError?.('音乐播放失败，请再次点击音乐按钮。')); }
    else this.play(this.desired || 'night', true);
    return this.enabled;
  }
  pause() { this.players.forEach(p => p.audio.pause()); }
  resume() { if (this.enabled) this.play(this.desired || 'night', true); }
}
