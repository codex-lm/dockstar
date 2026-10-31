/* DOCKSTAR - tiny WebAudio synth. All sounds generated, no audio assets. */
(function (global) {
  'use strict';

  var Sfx = {
    ctx: null, master: null, muted: false, noiseBuf: null,

    init: function () {
      if (Sfx.ctx) { if (Sfx.ctx.state === 'suspended') Sfx.ctx.resume(); return; }
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      Sfx.ctx = new AC();
      Sfx.master = Sfx.ctx.createGain();
      Sfx.master.gain.value = Sfx.muted ? 0 : 0.5;
      Sfx.master.connect(Sfx.ctx.destination);
      // pre-render 1s of white noise
      var len = Sfx.ctx.sampleRate | 0;
      Sfx.noiseBuf = Sfx.ctx.createBuffer(1, len, Sfx.ctx.sampleRate);
      var d = Sfx.noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    },

    setMuted: function (m) {
      Sfx.muted = m;
      if (Sfx.master) Sfx.master.gain.value = m ? 0 : 0.5;
    },

    _t: function () { return Sfx.ctx.currentTime; },

    // sweeping oscillator
    blip: function (f0, f1, dur, type, vol, when) {
      if (!Sfx.ctx) return;
      var t = Sfx._t() + (when || 0);
      var o = Sfx.ctx.createOscillator(), g = Sfx.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(Math.max(20, f0), t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(Sfx.master);
      o.start(t); o.stop(t + dur + 0.02);
    },

    // filtered noise burst
    noise: function (dur, vol, fFrom, fTo, when) {
      if (!Sfx.ctx) return;
      var t = Sfx._t() + (when || 0);
      var src = Sfx.ctx.createBufferSource();
      src.buffer = Sfx.noiseBuf; src.loop = true;
      var f = Sfx.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(fFrom, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, fTo), t + dur);
      var g = Sfx.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(Sfx.master);
      src.start(t); src.stop(t + dur + 0.02);
    },

    play: function (name, opt) {
      if (!Sfx.ctx || Sfx.muted) return;
      switch (name) {
        case 'shot':
          Sfx.blip(880, 320, 0.07, 'square', 0.10);
          break;
        case 'heavy':
          Sfx.blip(520, 140, 0.11, 'square', 0.13);
          Sfx.noise(0.05, 0.05, 3000, 400);
          break;
        case 'hit':
          Sfx.noise(0.05, 0.12, 5000, 900);
          Sfx.blip(220, 90, 0.05, 'square', 0.08);
          break;
        case 'explode':
          Sfx.noise(0.28, 0.22, 2600, 120);
          Sfx.blip(180, 40, 0.22, 'triangle', 0.16);
          break;
        case 'bigexplode':
          Sfx.noise(0.55, 0.3, 3200, 60);
          Sfx.blip(130, 28, 0.5, 'triangle', 0.22);
          Sfx.blip(90, 24, 0.6, 'sawtooth', 0.1, 0.05);
          break;
        case 'playerhit':
          Sfx.noise(0.4, 0.3, 4000, 100);
          Sfx.blip(400, 50, 0.35, 'sawtooth', 0.2);
          Sfx.blip(200, 40, 0.4, 'square', 0.14, 0.08);
          break;
        case 'modulelost':
          Sfx.blip(600, 120, 0.3, 'sawtooth', 0.16);
          Sfx.noise(0.3, 0.18, 2400, 200, 0.02);
          break;
        case 'dock':
          // rising arcade jingle C5 E5 G5 C6
          Sfx.blip(523, 523, 0.09, 'square', 0.14, 0.00);
          Sfx.blip(659, 659, 0.09, 'square', 0.14, 0.09);
          Sfx.blip(784, 784, 0.09, 'square', 0.14, 0.18);
          Sfx.blip(1047, 1047, 0.16, 'square', 0.16, 0.27);
          break;
        case 'dockperfect':
          Sfx.blip(523, 523, 0.08, 'square', 0.14, 0.00);
          Sfx.blip(659, 659, 0.08, 'square', 0.14, 0.08);
          Sfx.blip(784, 784, 0.08, 'square', 0.14, 0.16);
          Sfx.blip(1047, 1047, 0.08, 'square', 0.16, 0.24);
          Sfx.blip(1319, 1568, 0.22, 'square', 0.16, 0.32);
          break;
        case 'dockfail':
          Sfx.blip(440, 300, 0.12, 'square', 0.12, 0.00);
          Sfx.blip(330, 220, 0.16, 'square', 0.12, 0.13);
          break;
        case 'warning':
          for (var i = 0; i < 4; i++) {
            Sfx.blip(760, 760, 0.11, 'square', 0.12, i * 0.26);
            Sfx.blip(520, 520, 0.11, 'square', 0.12, i * 0.26 + 0.13);
          }
          break;
        case 'bosshit':
          Sfx.noise(0.04, 0.1, 4000, 800);
          break;
        case 'stageclear':
          Sfx.blip(659, 659, 0.1, 'square', 0.13, 0.00);
          Sfx.blip(784, 784, 0.1, 'square', 0.13, 0.11);
          Sfx.blip(988, 988, 0.1, 'square', 0.13, 0.22);
          Sfx.blip(1319, 1319, 0.24, 'square', 0.15, 0.33);
          break;
        case 'oneup':
          Sfx.blip(784, 784, 0.08, 'square', 0.15, 0.00);
          Sfx.blip(988, 988, 0.08, 'square', 0.15, 0.09);
          Sfx.blip(1175, 1175, 0.08, 'square', 0.15, 0.18);
          Sfx.blip(1568, 1568, 0.2, 'square', 0.16, 0.27);
          break;
        case 'gameover':
          Sfx.blip(392, 392, 0.22, 'triangle', 0.16, 0.00);
          Sfx.blip(330, 330, 0.22, 'triangle', 0.16, 0.24);
          Sfx.blip(262, 262, 0.3, 'triangle', 0.16, 0.48);
          Sfx.blip(196, 130, 0.7, 'triangle', 0.18, 0.8);
          break;
        case 'title':
          Sfx.blip(523, 523, 0.09, 'square', 0.1, 0.00);
          Sfx.blip(784, 784, 0.09, 'square', 0.1, 0.1);
          Sfx.blip(1047, 1047, 0.14, 'square', 0.12, 0.2);
          break;
        case 'ui':
          Sfx.blip(700, 900, 0.05, 'square', 0.08);
          break;
        case 'spawn':
          Sfx.blip(300, 480, 0.08, 'triangle', 0.07);
          break;
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sfx;
  else global.DOCKSTAR_SFX = Sfx;
})(typeof window !== 'undefined' ? window : globalThis);
