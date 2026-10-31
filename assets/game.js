/* DOCKSTAR - browser layer: canvas rendering, input, screens, audio hookup. */
(function (global) {
  'use strict';
  var E = global.DOCKSTAR_ENGINE, SPR = global.DOCKSTAR_SPRITES,
      FONT = global.DOCKSTAR_FONT, I18N = global.DOCKSTAR_I18N,
      SFX = global.DOCKSTAR_SFX;

  var COL = { bg: '#050505', W: '#ffffff', G: '#9a9a9a', D: '#5c5c5c', R: '#e0301e', r: '#8f1d12' };

  // ------------------------------------------------------------ utilities
  function el(id) { return document.getElementById(id); }
  var canvas, ctx;
  var lang = localStorage.getItem('dockstar.lang') || 'en';
  var muted = localStorage.getItem('dockstar.mute') === '1';
  var hiScore = parseInt(localStorage.getItem('dockstar.hi') || '0', 10) || 0;
  var T = function (k) { return I18N.get(lang, k); };

  // ---------------------------------------------------------------- state
  var screen = 'title'; // title | howto | play | over
  var st = null;
  var input = { left: 0, right: 0, up: 0, down: 0, fire: 0, touch: 0, tx: 0, ty: 0 };
  var paused = false;
  var frame = 0;
  var stars = [];
  var lastBoss = null, bossCv = null, bossWhite = null;
  var touchDevice = 'ontouchstart' in window;

  function makeStars() {
    stars = [];
    for (var i = 0; i < 30; i++) {
      stars.push({ x: Math.random() * 240, y: Math.random() * 320, s: 0.3 + Math.random() * 1.2, c: Math.random() < 0.7 ? '#3a3a3a' : '#6b6b6b' });
    }
  }

  function startGame() {
    st = E.createGame({ seed: (Date.now() & 0xffff) ^ (Math.random() * 0xffff | 0), hi: hiScore });
    lastBoss = null; bossCv = bossWhite = null;
    screen = 'play'; paused = false;
  }

  // ------------------------------------------------------------- font draw
  var fontAtlas = null, fontIndex = null;
  function buildFont() {
    var chars = Object.keys(FONT.glyphs);
    fontAtlas = document.createElement('canvas');
    fontAtlas.width = chars.length * 6; fontAtlas.height = 7;
    var fx = fontAtlas.getContext('2d');
    fontIndex = {};
    chars.forEach(function (ch, i) {
      fontIndex[ch] = i * 6;
      var rows = FONT.glyphs[ch];
      fx.fillStyle = '#ffffff';
      for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) {
        if (rows[r] & (16 >> c)) fx.fillRect(i * 6 + c, r, 1, 1);
      }
    });
  }
  function text(s, x, y, color, scale) {
    s = String(s).toUpperCase();
    scale = scale || 1;
    ctx.fillStyle = color;
    var cw = 6 * scale;
    for (var i = 0; i < s.length; i++) {
      var ch = FONT.map(s.charAt(i));
      var sx = fontIndex[ch];
      ctx.save();
      ctx.translate(Math.round(x + i * cw), Math.round(y));
      ctx.scale(scale, scale);
      ctx.drawImage(fontAtlas, sx, 0, 5, 7, 0, 0, 5, 7);
      ctx.restore();
    }
  }
  function textC(s, y, color, scale) {
    scale = scale || 1;
    var w = String(s).length * 6 * scale - scale;
    text(s, Math.round((240 - w) / 2), y, color, scale);
  }
  function pad6(n) { var s = String(Math.min(n, 999999)); while (s.length < 6) s = '0' + s; return s; }

  // ------------------------------------------------------------ boss art
  function buildBoss(b) {
    var w = Math.round(b.w), h = Math.round(b.h);
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var x = cv.getContext('2d');
    function px(a, bb, ww, hh, c) { x.fillStyle = c; x.fillRect(a, bb, ww, hh); }
    if (b.tier === 0) { // GATEKEEPER
      var pw = 7;
      px(0, 0, pw, h, COL.D); px(w - pw, 0, pw, h, COL.D);
      px(0, 0, 1, h, COL.W); px(w - 1, 0, 1, h, COL.W);
      px(2, 3, 2, 3, COL.R); px(w - 4, 3, 2, 3, COL.R);
      px(2, h - 6, 2, 3, COL.R); px(w - 4, h - 6, 2, 3, COL.R);
      px(pw, 3, w - 2 * pw, 5, COL.G); px(pw, h - 8, w - 2 * pw, 5, COL.G);
      for (var i = pw + 3; i < w - pw - 2; i += 6) { px(i, 4, 2, 3, COL.D); px(i, h - 7, 2, 3, COL.D); }
    } else if (b.tier === 1) { // GEMINI
      var tw = Math.floor((w - 12) / 2);
      [0, w - tw].forEach(function (tx0, k) {
        px(tx0, 0, tw, h, COL.D);
        px(tx0, 0, 1, h, COL.W); px(tx0 + tw - 1, 0, 1, h, COL.W);
        px(tx0 + 3, 4, tw - 6, 3, COL.r);
        px(tx0 + 3, h - 7, tw - 6, 3, COL.r);
        for (var i = 5; i < h - 8; i += 6) px(tx0 + 2, i, tw - 4, 1, COL.G);
        px(tx0 + Math.floor(tw / 2) - 1, h - 2, 3, 2, k ? COL.R : COL.R);
      });
      px(tw, Math.floor(h / 2) - 2, w - 2 * tw, 5, COL.G);
      px(tw, Math.floor(h / 2) - 2, w - 2 * tw, 1, COL.W);
    } else { // BASTION
      px(2, 0, w - 4, h, COL.D);
      px(0, 3, w, h - 6, COL.D);
      px(2, 0, w - 4, 1, COL.W); px(0, 3, 1, h - 6, COL.W);
      px(w - 1, 3, 1, h - 6, COL.W); px(2, h - 1, w - 4, 1, COL.W);
      for (var j = 4; j < h - 6; j += 5) px(3, j, w - 6, 1, COL.G);
      px(3, h - 5, w - 6, 3, COL.r);
      for (var k = 8; k < w - 6; k += 10) { px(k, 1, 2, 2, COL.R); px(k, h - 3, 2, 2, COL.R); }
    }
    // white silhouette for hit flash
    var wc = document.createElement('canvas'); wc.width = w; wc.height = h;
    var wx = wc.getContext('2d');
    wx.drawImage(cv, 0, 0);
    wx.globalCompositeOperation = 'source-in';
    wx.fillStyle = '#ffffff'; wx.fillRect(0, 0, w, h);
    bossCv = cv; bossWhite = wc;
    lastBoss = b;
  }

  // ---------------------------------------------------------------- render
  function drawStars(warp) {
    for (var i = 0; i < stars.length; i++) {
      var s2 = stars[i];
      s2.y += s2.s * (warp ? 4 : 1);
      if (s2.y > 320) { s2.y = -2; s2.x = Math.random() * 240; }
      ctx.fillStyle = s2.c;
      ctx.fillRect(s2.x | 0, s2.y | 0, 1, s2.s > 1 ? 2 : 1);
    }
  }

  function drawPlayer() {
    var p = st.player;
    if (!p.alive) return;
    if (p.invuln > 0 && (frame % 8) < 3) return;
    var y = p.y;
    for (var i = 0; i < p.stack.length; i++) {
      var m = E.MOD[p.stack[i]];
      SPR.draw(ctx, m.spr, p.x - m.w / 2, y - m.h);
      y -= m.h;
    }
    // flame under the bottom module
    var f = (frame >> 2) & 1 ? 'flame1' : 'flame2';
    SPR.draw(ctx, f, p.x - 2.5, p.y);
  }

  function drawEnemies() {
    for (var i = 0; i < st.enemies.length; i++) {
      var e = st.enemies[i], def = E.ENEMY[e.type];
      var spr = def.spr.length > 1 ? def.spr[((frame >> 3) + i) % def.spr.length] : def.spr[0];
      if (e.type === 'dart' && e.state === 'aim' && (frame % 10) < 5) continue; // blink before dive
      SPR.draw(ctx, spr, e.x - def.w / 2, e.y);
    }
  }

  function drawModule() {
    var m = st.module;
    if (!m) return;
    var def = E.MOD[m.kind];
    SPR.draw(ctx, def.spr, m.x - def.w / 2, m.y);
    // blinking docking beacon under the module
    if ((frame >> 3) & 1) {
      ctx.fillStyle = COL.R;
      ctx.fillRect(m.x - 4, m.y + def.h + 2, 9, 2);
      ctx.fillStyle = COL.W;
      ctx.fillRect(m.x - 1, m.y + def.h + 2, 3, 2);
    }
  }

  function drawBoss() {
    var b = st.boss;
    if (!b) return;
    if (b !== lastBoss) buildBoss(b);
    if (b.tier === 2) {
      // serpent: head + segments
      for (var i = b.segs.length - 1; i >= 0; i--) {
        var sg = b.segs[i];
        if (sg.hp <= 0) continue;
        SPR.draw(ctx, i % 2 ? 'seg2' : 'seg1', sg.x - 5, sg.y - 5);
      }
      SPR.draw(ctx, 'seghead', b.x - 6, b.y - 6);
      if (b.flash > 0 && (frame & 1)) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(b.x - 6, b.y - 6, 13, 13);
      }
    } else {
      ctx.drawImage(bossCv, Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2));
      if (b.flash > 0 && (frame & 1)) {
        ctx.drawImage(bossWhite, Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2));
      }
      // pulsing cores
      if (b.cores) {
        var pulse = (frame >> 2) & 1;
        for (var c = 0; c < b.cores.length; c++) {
          var co = b.cores[c];
          SPR.draw(ctx, 'core', b.x + co.dx * b.w - 3, b.y + co.dy * b.h - 3);
          if (pulse) { ctx.fillStyle = COL.W; ctx.fillRect(b.x + co.dx * b.w - 1, b.y + co.dy * b.h - 1, 2, 2); }
        }
      }
      if (b.turrets) {
        for (var t = 0; t < b.turrets.length; t++) {
          var tu = b.turrets[t];
          if (tu.hp <= 0) continue;
          // barrel points down at the player: flip vertically
          ctx.save();
          ctx.translate(Math.round(tu.x), Math.round(tu.y));
          ctx.scale(1, -1);
          ctx.drawImage(SPR.canvas.turret, -4, -4);
          ctx.restore();
        }
      }
    }
    // hp bar
    if (!b.dead) {
      var frac = Math.max(0, b.hp / b.maxHp);
      ctx.fillStyle = COL.W; ctx.fillRect(7, 25, 226, 6);
      ctx.fillStyle = COL.bg; ctx.fillRect(8, 26, 224, 4);
      ctx.fillStyle = COL.R; ctx.fillRect(8, 26, Math.round(224 * frac), 4);
    }
  }

  function drawBullets() {
    var i;
    ctx.fillStyle = COL.W;
    for (i = 0; i < st.pbullets.length; i++) {
      var pb = st.pbullets[i];
      if (pb.heavy) {
        ctx.fillStyle = COL.W; ctx.fillRect(pb.x - 1, pb.y, 3, 8);
        ctx.fillStyle = COL.R; ctx.fillRect(pb.x - 1, pb.y, 3, 2);
      } else {
        ctx.fillRect(pb.x - 1, pb.y, 2, 6);
      }
    }
    for (i = 0; i < st.ebullets.length; i++) {
      var eb = st.ebullets[i];
      ctx.fillStyle = COL.R; ctx.fillRect(eb.x - 2, eb.y - 2, 4, 4);
      ctx.fillStyle = COL.W; ctx.fillRect(eb.x - 1, eb.y - 1, 2, 2);
    }
  }

  function drawFx() {
    for (var i = 0; i < st.parts.length; i++) {
      var q = st.parts[i];
      ctx.fillStyle = COL[q.c] || COL.W;
      ctx.globalAlpha = q.flashP ? Math.min(1, q.life / 7) * 0.9 : Math.min(1, q.life / 14);
      ctx.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < st.pops.length; i++) {
      var p2 = st.pops[i];
      ctx.globalAlpha = Math.min(1, p2.life / 18);
      text(p2.text, p2.x - p2.text.length * 3, p2.y, COL.R, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    // top strip
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, 240, 22);
    ctx.fillStyle = COL.r; ctx.fillRect(0, 21, 240, 1);
    text('1UP', 6, 3, COL.R);
    text(pad6(st.score), 28, 8, COL.W);
    text('HI', 108, 3, COL.R);
    text(pad6(st.hi), 128, 8, st.newRecord ? COL.R : COL.W);
    text('ST.' + st.stage, 204, 3, COL.G);
    // lives (mini fighters)
    for (var i = 0; i < Math.min(st.lives, 6); i++) {
      ctx.save();
      ctx.translate(6 + i * 6, 306);
      ctx.scale(0.55, 0.55);
      ctx.drawImage(SPR.canvas.fighter, 0, 0);
      ctx.restore();
    }
    // module letters owned
    var order = ['F', 'C', 'R'];
    for (i = 0; i < order.length; i++) {
      var has = st.player.stack.indexOf(order[i]) >= 0;
      text(order[i], 214 + 0, 296 + i * 7, has ? COL.W : COL.D);
    }
  }

  function bannerText(b) {
    switch (b.key) {
      case 'stage': return T('stage') + ' ' + b.arg;
      case 'clear': return T('stageClear');
      case 'warning': return T('warning');
      case 'bossName': return String(b.arg);
      case 'ready': return T('ready');
      case 'moduleLost': return T('moduleLost');
      case 'docked': return T('docked');
      case 'perfectDock': return T('perfectDock');
      case 'dockMissed': return T('dockMissed');
      case 'fullShip': return T('fullShip');
    }
    return '';
  }
  function drawBanner() {
    if (!st.banner || st.banner.t <= 0) return;
    var b = st.banner;
    var s = b.key === 'warning' ? 2 : 1;
    var txt = bannerText(b);
    var y = 118;
    // black backing strip
    var w = txt.length * 6 * s;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, y - 6, 240, 14 * s + 8);
    if (b.key === 'warning') {
      if ((frame >> 3) & 1) textC(txt, y, COL.R, 2);
      else textC(txt, y, COL.W, 2);
    } else if (b.key === 'bossName') {
      textC(txt, y, COL.R, 1);
    } else if (b.key === 'clear') {
      textC(txt, y, COL.W, 1);
      if (st.phase === 'clear') textC(T('stageBonus') + ' ' + st.bonusLeft, y + 14, COL.R, 1);
    } else {
      textC(txt, y, COL.W, 1);
    }
  }

  function drawDockHint() {
    if (st.phase !== 'docking' || !st.module) return;
    var m = st.module;
    var name = I18N.moduleNames[m.kind];
    var line = T('dockThe') + ' ' + name + '!';
    textC(line, 130, COL.W);
    // arrow pointing at the module
    if ((frame >> 3) & 1) {
      var ax = Math.max(10, Math.min(230, m.x));
      var ay = Math.max(34, Math.min(150, m.y - 10));
      text('↓', ax - 2, ay, COL.R, 1);
    }
  }

  // ------------------------------------------------------------- screens
  function drawLogo(y) {
    var s = 3, txt = 'DOCKSTAR';
    var w = txt.length * 6 * s - s;
    var x = Math.round((240 - w) / 2);
    text(txt, x + 2, y + 2, COL.r, s);
    text(txt, x, y, COL.W, s);
    // vermillion underline
    ctx.fillStyle = COL.R;
    ctx.fillRect(x, y + 7 * s + 4, w, 3);
    ctx.fillRect(x + w / 2 - 3, y + 7 * s + 4, 6, 3);
  }

  function drawTitle() {
    drawStars(false);
    // header row
    text('HI-SCORE', 78, 6, COL.R);
    text(pad6(hiScore), 138, 6, COL.W);
    drawLogo(40);
    textC(T('tagline'), 76, COL.G);
    if ((frame % 60) < 38) textC(T('pressStart'), 142, COL.W);
    textC(T('howtoBtn'), 162, COL.D);
    if (touchDevice) textC(T('touchHint'), 184, COL.D);
    else textC(T('controlsHint'), 184, COL.D);
    // faded parade of foes
    var foes = [['drone1', 34, 204], ['moth1', 92, 212], ['spitter1', 150, 204], ['splitter', 198, 208]];
    ctx.globalAlpha = 0.55;
    for (var f = 0; f < foes.length; f++) {
      SPR.draw(ctx, foes[f][0], foes[f][1] + Math.sin(frame * 0.03 + f) * 5, foes[f][2]);
    }
    ctx.globalAlpha = 1;
    // demo stack at the bottom
    var bob = Math.sin(frame * 0.05) * 3;
    var px2 = 120, py = 282 + bob;
    var stack = ['F', 'C', 'R'];
    for (var i = 0; i < stack.length; i++) {
      var m = E.MOD[stack[i]];
      SPR.draw(ctx, m.spr, px2 - m.w / 2, py - m.h);
      py -= m.h;
    }
    SPR.draw(ctx, (frame >> 2) & 1 ? 'flame1' : 'flame2', px2 - 2.5, 282 + bob);
    textC('Z CODE 2026', 304, COL.G);
  }

  function drawHowto() {
    drawStars(false);
    textC(T('howtoTitle'), 12, COL.R, 2);
    var y = 44;
    for (var i = 1; i <= 9; i++) {
      textC(T('howto' + i), y, COL.W);
      y += 14;
      if (i === 1) {
        // module diagram
        var mx = 120, my = y + 26;
        var order = ['F', 'C', 'R'];
        for (var k = 0; k < order.length; k++) {
          var m = E.MOD[order[k]];
          SPR.draw(ctx, m.spr, mx - m.w / 2, my - m.h);
          my -= m.h;
        }
        SPR.draw(ctx, 'flame1', mx - 2.5, y + 26);
        y += 34;
      }
    }
    if ((frame % 60) < 38) textC(T('pressStart'), 268, COL.W);
    textC(T('controlsHint'), 288, COL.D);
  }

  function drawOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, 240, 320);
    textC(T('gameOver'), 92, COL.R, 2);
    textC(pad6(st.score), 126, COL.W, 2);
    if (st.newRecord && (frame % 40) < 26) textC(T('newRecord'), 148, COL.R);
    textC('HI ' + pad6(st.hi), 168, COL.G);
    if ((frame % 60) < 38) textC(T('playAgain'), 210, COL.W);
  }

  function drawPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, 240, 320);
    textC(T('pause'), 130, COL.W, 2);
    textC(T('resume'), 158, COL.G);
  }

  function render() {
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, 240, 320);
    var warp = st && st.phase === 'bossintro';
    if (screen === 'play' && st) {
      ctx.save();
      if (st.shake > 0) ctx.translate((Math.random() * 4 - 2) | 0, (Math.random() * 4 - 2) | 0);
      drawStars(warp);
      drawEnemies();
      drawModule();
      drawBoss();
      drawPlayer();
      drawBullets();
      drawFx();
      ctx.restore();
      if (st.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, 240, 320); }
      drawHUD();
      drawBanner();
      drawDockHint();
      if (st.phase === 'dead' && !st.player.alive) {
        // nothing extra: particles carry the moment
      }
      if (paused) drawPause();
      if (st.phase === 'gameover' && st.phaseT > 30) drawOver();
    } else if (screen === 'title') {
      drawTitle();
    } else if (screen === 'howto') {
      drawHowto();
    }
  }

  // ---------------------------------------------------------------- events
  function drainEvents() {
    for (var i = 0; i < st.events.length; i++) {
      var e = st.events[i];
      SFX.play(e.type, e.data);
    }
    st.events.length = 0;
  }

  // ------------------------------------------------------------------ loop
  var acc = 0, last = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    if (!last) last = t;
    var dt = Math.min(t - last, 100); last = t;
    frame++;
    if (screen === 'play' && st && !paused) {
      acc += dt;
      while (acc >= 1000 / 60) {
        var inp = {
          left: input.left, right: input.right, up: input.up, down: input.down,
          fire: input.fire, touch: input.touch, tx: input.tx, ty: input.ty
        };
        E.step(st, inp);
        drainEvents();
        acc -= 1000 / 60;
        if (st.phase === 'gameover' && st.phaseT === 1) {
          if (st.hi > hiScore) { hiScore = st.hi; localStorage.setItem('dockstar.hi', String(hiScore)); }
        }
      }
      acc = Math.min(acc, 100);
    } else acc = 0;
    render();
  }

  // ---------------------------------------------------------------- input
  function firePressed() {
    SFX.init();
    SFX.play('ui');
    if (screen === 'title') { startGame(); return; }
    if (screen === 'howto') { screen = 'title'; return; }
    if (screen === 'play') {
      if (paused) { paused = false; return; }
      if (st.phase === 'gameover' && st.phaseT > 60) { startGame(); return; }
    }
  }
  function menuPressed() {
    if (screen === 'howto') { screen = 'title'; return; }
    if (screen === 'play' && st && st.phase === 'gameover' && st.phaseT > 60) {
      screen = 'title'; saveHi();
    }
  }
  function saveHi() {
    if (st && st.hi > hiScore) { hiScore = st.hi; localStorage.setItem('dockstar.hi', String(hiScore)); }
  }

  global.addEventListener('keydown', function (e) {
    var k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].indexOf(k) >= 0) e.preventDefault();
    if (e.repeat) return;
    switch (k) {
      case 'ArrowLeft': case 'a': case 'A': case 'q': case 'Q': input.left = 1; break;
      case 'ArrowRight': case 'd': case 'D': input.right = 1; break;
      case 'ArrowUp': case 'w': case 'W': case 'z': case 'Z': input.up = 1; break;
      case 'ArrowDown': case 's': case 'S': input.down = 1; break;
      case ' ': case 'x': case 'X': case 'k': case 'K': input.fire = 1; firePressed(); break;
      case 'Enter': firePressed(); break;
      case 'p': case 'P': if (screen === 'play') { paused = !paused; SFX.play('ui'); } break;
      case 'm': case 'M': toggleMute(); break;
      case 'h': case 'H': if (screen === 'title') { screen = 'howto'; Sfx2(); } break;
      case 't': case 'T': menuPressed(); break;
    }
  });
  global.addEventListener('keyup', function (e) {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': case 'q': case 'Q': input.left = 0; break;
      case 'ArrowRight': case 'd': case 'D': input.right = 0; break;
      case 'ArrowUp': case 'w': case 'W': case 'z': case 'Z': input.up = 0; break;
      case 'ArrowDown': case 's': case 'S': input.down = 0; break;
      case ' ': case 'x': case 'X': case 'k': case 'K': input.fire = 0; break;
    }
  });

  function wireCanvas() {
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      SFX.init();
      var p = canvasPos(e);
      if (screen === 'title') {
        // menu zone (howto) top right, otherwise start
        if (p.x > 168 && p.y < 34) { screen = 'howto'; SFX.play('ui'); return; }
        SFX.play('ui'); startGame(); return;
      }
      if (screen === 'howto') { screen = 'title'; SFX.play('ui'); return; }
      if (screen === 'play') {
        if (paused) { paused = false; SFX.play('ui'); return; }
        if (st.phase === 'gameover' && st.phaseT > 60) {
          if (p.x > 160 && p.y < 40) { screen = 'title'; saveHi(); SFX.play('ui'); }
          else startGame();
          return;
        }
        input.touch = 1; input.tx = p.x; input.ty = p.y;
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!input.touch) return;
      var p = canvasPos(e);
      input.tx = p.x; input.ty = p.y;
    });
    function endTouch() { input.touch = 0; }
    canvas.addEventListener('pointerup', endTouch);
    canvas.addEventListener('pointercancel', endTouch);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function canvasPos(ev2) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev2.clientX - r.left) * 240 / r.width, y: (ev2.clientY - r.top) * 320 / r.height };
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && screen === 'play') paused = true;
  });

  function Sfx2() { SFX.play('ui'); }

  // ------------------------------------------------------------ page UI
  function applyLang() {
    document.documentElement.lang = lang;
    el('tagline').textContent = T('tagline');
    el('foot').textContent = T('footer');
    var btns = document.querySelectorAll('#langs button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-lang') === lang);
    }
    localStorage.setItem('dockstar.lang', lang);
  }
  var langs = el('langs');
  if (langs) {
    langs.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      lang = b.getAttribute('data-lang');
      SFX.init(); SFX.play('ui');
      applyLang();
    });
  }
  function toggleMute() {
    muted = !muted;
    SFX.setMuted(muted);
    el('btn-sound').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    el('btn-sound').classList.toggle('off', muted);
    localStorage.setItem('dockstar.mute', muted ? '1' : '0');
  }
  var sndBtn = el('btn-sound');
  if (sndBtn) sndBtn.addEventListener('click', function () { SFX.init(); toggleMute(); });

  // ---------------------------------------------------------------- boot
  function boot() {
    canvas = el('game');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    SPR.build();
    buildFont();
    makeStars();
    wireCanvas();
    SFX.setMuted(muted);
    el('btn-sound').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    el('btn-sound').classList.toggle('off', muted);
    applyLang();
    // read-only introspection hook (QA, screenshots; documented in README)
    global.__dockstar = {
      get st() { return st; },
      get screen() { return screen; },
      get paused() { return paused; },
      start: startGame
    };
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
