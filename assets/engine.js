/* DOCKSTAR - pure game engine (no DOM, deterministic, browser + Node).
   One step() = one 60 Hz frame. Rendering, audio and i18n live outside. */
(function (global) {
  'use strict';

  var W = 240, H = 320, HUD_H = 22;

  // ---------------------------------------------------------------- utils
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function roman(n) { return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n - 1] || ('MK' + n); }

  // ------------------------------------------------------- player modules
  // canonical order top -> bottom
  var ORDER = ['F', 'C', 'R'];
  var MOD = {
    F: { w: 11, h: 12, spr: 'fighter' },
    C: { w: 17, h: 13, spr: 'cruiser' },
    R: { w: 19, h: 12, spr: 'reactor' }
  };
  function statsFor(stack) {
    var has = {}, i;
    for (i = 0; i < stack.length; i++) has[stack[i]] = true;
    var w = 0, h = 0;
    for (i = 0; i < stack.length; i++) {
      var m = MOD[stack[i]];
      if (m.w > w) w = m.w;
      h += m.h;
    }
    var spd = 1.7, guns = [{ dx: 0, heavy: false, vx: 0 }], cd = 12;
    if (has.F && has.C && has.R) {
      spd = 1.3; cd = 13;
      guns = [{ dx: -4, heavy: false, vx: 0 }, { dx: 4, heavy: false, vx: 0 },
              { dx: -6, heavy: false, vx: -0.55 }, { dx: 6, heavy: false, vx: 0.55 }];
    } else if (has.F && has.C) {
      spd = 1.5; cd = 12;
      guns = [{ dx: -4, heavy: false, vx: 0 }, { dx: 4, heavy: false, vx: 0 }];
    } else if (has.C && has.R) {
      spd = 1.2; cd = 14;
      guns = [{ dx: -5, heavy: false, vx: 0 }, { dx: 5, heavy: false, vx: 0 },
              { dx: 0, heavy: true, vx: 0 }];
    } else if (has.C) {
      spd = 1.4; cd = 12;
      guns = [{ dx: -4, heavy: false, vx: 0 }, { dx: 4, heavy: false, vx: 0 }];
    } else if (has.R) {
      spd = 1.15; cd = 16;
      guns = [{ dx: 0, heavy: true, vx: 0 }];
    } else { // F alone
      spd = 1.7; cd = 11;
      guns = [{ dx: 0, heavy: false, vx: 0 }];
    }
    return { w: w, h: h, spd: spd, guns: guns, cd: cd };
  }

  // --------------------------------------------------------------- enemies
  var ENEMY = {
    drone:    { w: 12, h: 10, hp: 1, score: 50,  spr: ['drone1', 'drone2'], col: 'C' },
    moth:     { w: 15, h: 11, hp: 1, score: 80,  spr: ['moth1', 'moth2'], col: 'M' },
    dart:     { w: 9,  h: 13, hp: 1, score: 100, spr: ['dart'], col: 'Y' },
    spitter:  { w: 14, h: 13, hp: 2, score: 150, spr: ['spitter1', 'spitter2'], col: 'V' },
    splitter: { w: 18, h: 16, hp: 3, score: 200, spr: ['splitter'], col: 'P' },
    mini:     { w: 8,  h: 9,  hp: 1, score: 50,  spr: ['mini1', 'mini2'], col: 'P' }
  };

  function bulletSpeed(stage) { return Math.min(1.2 + 0.07 * stage, 2.3); }

  function composeStage(stage, rng) {
    // Returns a list of groups: {type, count, interval, opts}
    function G(type, count, interval, opts) {
      var g = { type: type, count: count, interval: interval, spawned: 0, t: 0, done: false };
      if (opts) for (var k in opts) g[k] = opts[k];
      return g;
    }
    var s = stage, gs = [];
    if (s === 1) {
      gs.push(G('drone', 6, 26, { col: true }));
      gs.push(G('moth', 5, 32, { side: rng() < 0.5 ? 1 : -1 }));
      gs.push(G('drone', 5, 22, { col: true }));
      gs.push(G('dart', 3, 46));
      gs.push(G('spitter', 2, 90));
    } else if (s === 2) {
      gs.push(G('moth', 6, 28, { side: 1 }));
      gs.push(G('drone', 6, 22, { col: true }));
      gs.push(G('splitter', 2, 80));
      gs.push(G('dart', 4, 42));
      gs.push(G('spitter', 3, 80));
    } else {
      var mix = ['drone', 'moth', 'dart', 'spitter', 'splitter'];
      var nGroups = 5 + Math.min(s - 3, 3);
      var idx = Math.floor(rng() * mix.length);
      for (var i = 0; i < nGroups; i++) {
        var type = mix[(idx + i) % mix.length];
        var base = { drone: 7, moth: 6, dart: 4, spitter: 3, splitter: 2 }[type];
        var count = base + Math.min(Math.floor(s / 2), 6);
        var interval = Math.max(14, { drone: 24, moth: 28, dart: 40, spitter: 75, splitter: 70 }[type] - s);
        var opts = {};
        if (type === 'moth') opts.side = rng() < 0.5 ? 1 : -1;
        if (type === 'drone') opts.col = true;
        if (type === 'spitter') opts.count = Math.min(count, 5);
        else opts.count = Math.min(count, 12);
        gs.push(G(type, opts.count, interval, opts));
      }
    }
    return gs;
  }

  // ----------------------------------------------------------------- boss
  var BOSS_NAMES = ['GATEKEEPER', 'GEMINI', 'OUROBOROS', 'BASTION'];
  function makeBoss(stage, gameW) {
    var tier = (stage - 1) % 4;
    var mk = 1 + Math.floor((stage - 1) / 4);
    var se = Math.min(stage, 8); // HP scaling freezes at stage 8 (Kimi review)
    var name = BOSS_NAMES[tier] + (mk > 1 ? ' MK-' + roman(mk) : '');
    var b = {
      tier: tier, stage: stage, name: name, t: 0,
      x: (gameW || W) / 2, y: -40, vx: 0, flash: 0, rage: false, dead: false, deathT: 0
    };
    if (tier === 0) {        // GATEKEEPER: gate with one core
      b.w = Math.min(48 + 8 * (stage - 1), 96);
      b.h = 30;
      b.hp = b.maxHp = 30 + 22 * (se - 1);
      b.cores = [{ dx: 0, dy: 0 }];
    } else if (tier === 1) { // GEMINI: two cores
      b.w = Math.min(62 + 8 * (stage - 2), 110);
      b.h = 34;
      b.hp = b.maxHp = 48 + 30 * (se - 2);
      b.cores = [{ dx: -0.28, dy: 0 }, { dx: 0.28, dy: 0 }];
    } else if (tier === 2) { // OUROBOROS: serpent of segments
      var n = 5 + Math.min(Math.floor((stage - 3) / 2), 3);
      var segHp = 6 + 3 * (se - 3);
      b.segs = [];
      for (var i = 0; i < n; i++) b.segs.push({ hp: segHp, maxHp: segHp, x: (gameW || W) / 2, y: -20 - i * 12 });
      b.w = 13; b.h = 13;
      b.hp = b.maxHp = n * segHp;
      b.trail = [];
    } else {                 // BASTION: fortress with turrets
      b.w = Math.min(76 + 10 * (stage - 4), 126);
      b.h = 36;
      b.hp = b.maxHp = 90 + 45 * (se - 4);
      var nt = 2 + Math.min(Math.floor((stage - 4) / 2), 3);
      b.cores = [{ dx: 0, dy: 0 }];
      b.turrets = [];
      for (var j = 0; j < nt; j++) {
        b.turrets.push({ dx: (j - (nt - 1) / 2) * 0.62, hp: 8 + 2 * (se - 4), cd: 60 + j * 17, x: 0, y: 0 });
      }
    }
    b.coolFan = 90; b.coolWall = 150; b.coolSpiral = 190; b.spiralA = 0;
    return b;
  }

  // ------------------------------------------------------------------ game
  function createGame(opts) {
    opts = opts || {};
    var GW = opts.width || W, GH = opts.height || H;
    var st = {
      W: GW, H: GH, hudH: HUD_H,
      frame: 0,
      rng: mulberry32(opts.seed || 20261031),
      phase: 'waves', phaseT: 0,
      stage: 1, score: 0, hi: opts.hi || 0, hi0: opts.hi || 0,
      lives: 3, nextExtra: 20000, newRecord: false,
      player: { x: GW / 2, y: GH - 40, stack: ['F'], cool: 0, invuln: 100, alive: true, respawnT: 0 },
      pbullets: [], ebullets: [], enemies: [], parts: [], pops: [],
      module: null, boss: null,
      plan: null, restT: 0,
      banner: null, events: [], shake: 0, flash: 0,
      clearT: 0, bonusLeft: 0
    };
    st.plan = { groups: composeStage(1, st.rng), gi: 0, t: 40, restT: 0 };
    banner(st, 'stage', 1, 110);
    return st;
  }

  function banner(st, key, arg, dur) { st.banner = { key: key, arg: arg, t: dur || 100, dur: dur || 100 }; }
  function ev(st, type, data) { st.events.push({ type: type, data: data || null }); }
  function pop(st, x, y, text) { st.pops.push({ x: x, y: y, text: text, life: 46 }); }
  function burst(st, x, y, n, big, col) {
    col = col || 'R';
    var dark = col.toLowerCase();
    for (var i = 0; i < n; i++) {
      var a = st.rng() * Math.PI * 2, sp = (big ? 1.6 : 0.9) + st.rng() * (big ? 2.4 : 1.6);
      var cr = st.rng();
      st.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 20 + st.rng() * 22 | 0,
        c: cr < 0.5 ? col : (cr < 0.78 ? 'W' : dark), sz: st.rng() < 0.3 ? 3 : 2
      });
    }
    st.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 7, c: 'W', sz: big ? 22 : 12, flashP: true });
  }
  function addScore(st, n) {
    st.score += n;
    if (st.score > st.hi) { st.hi = st.score; if (st.score > st.hi0) st.newRecord = true; }
    if (st.score >= st.nextExtra) {
      st.lives++; st.nextExtra += 50000;
      ev(st, 'oneup'); pop(st, st.player.x, st.player.y - 30, '1UP!');
    }
  }
  function eShot(st, x, y, vx, vy) { st.ebullets.push({ x: x, y: y, vx: vx, vy: vy }); }
  function aimShot(st, x, y, sp) {
    var dx = st.player.x - x, dy = (st.player.y - 14) - y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    eShot(st, x, y, dx / d * sp, dy / d * sp);
  }

  // -------------------------------------------------------------- spawning
  function spawnEnemy(st, g) {
    var t = g.type, r = st.rng;
    var e = { type: t, t: 0, hp: ENEMY[t].hp, fireT: 60 + r() * 200 | 0 };
    if (t === 'drone') {
      e.x = g.col ? st.W * 0.12 + (g.spawned % 2) * 10 + r() * st.W * 0.66 : st.W * 0.08 + r() * st.W * 0.84;
      e.y = -12; e.baseX = e.x; e.phase = r() * 6.28;
    } else if (t === 'moth') {
      var side = g.side || 1;
      e.x = side > 0 ? -10 : st.W + 10; e.dir = side;
      e.enterY = st.H * 0.13 + r() * st.H * 0.28; e.y = e.enterY; e.phase = r() * 6.28;
    } else if (t === 'dart') {
      e.x = 24 + r() * (st.W - 48); e.y = -12; e.state = 'aim'; e.aimT = 60 + r() * 30 | 0;
    } else if (t === 'spitter') {
      e.x = st.W * 0.1 + r() * st.W * 0.8; e.y = -12; e.targetY = st.H * 0.14 + r() * st.H * 0.2;
      e.volleys = st.stage === 1 ? 3 : (4 + (st.stage >= 5 ? 1 : 0)); e.cd = 80; e.phase = r() * 6.28;
      e.hp = ENEMY.spitter.hp + (st.stage >= 5 ? 1 : 0);
    } else if (t === 'splitter') {
      e.x = st.W * 0.1 + r() * st.W * 0.8; e.y = -16; e.phase = r() * 6.28;
      e.hp = Math.min(6, ENEMY.splitter.hp + Math.floor(st.stage / 4));
    }
    st.enemies.push(e);
    ev(st, 'spawn');
  }

  // --------------------------------------------------------------- updates
  function updatePlayer(st, input) {
    var p = st.player;
    if (!p.alive) return;
    var s = statsFor(p.stack);
    var spd = s.spd;
    var dx = 0, dy = 0;
    if (input.touch) {
      // steer toward the touch target at max speed
      var tx = clamp(input.tx, 12, st.W - 12), ty = clamp(input.ty - 24, st.H * 0.34, st.H - 14);
      var ddx = tx - p.x, ddy = ty - p.y;
      var d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d > 1) { dx = ddx / d * spd; dy = ddy / d * spd; }
    } else {
      if (input.left) dx -= spd;
      if (input.right) dx += spd;
      if (input.up) dy -= spd;
      if (input.down) dy += spd;
    }
    p.x = clamp(p.x + dx, 12, st.W - 12);
    p.y = clamp(p.y + dy, st.H * 0.34 + s.h, st.H - 12);
    if (p.cool > 0) p.cool--;
    if (p.invuln > 0) p.invuln--;
    if ((input.fire || input.touch) && p.cool === 0) {
      p.cool = s.cd;
      for (var i = 0; i < s.guns.length; i++) {
        var g = s.guns[i];
        st.pbullets.push({
          x: p.x + g.dx, y: p.y - s.h + (g.heavy ? 2 : 0),
          vx: g.vx, vy: -4, dmg: g.heavy ? 2 : 1, heavy: g.heavy
        });
      }
      ev(st, s.guns[0].heavy && s.guns.length === 1 ? 'heavy' : 'shot');
    }
  }

  function updateEnemies(st) {
    var bs = bulletSpeed(st.stage), p = st.player;
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      e.t++;
      if (e.type === 'drone') {
        e.y += 0.42;
        e.x = e.baseX + Math.sin(e.t * 0.04 + e.phase) * 18;
        if (e.t > 60 && e.y < st.H * 0.66 && st.rng() < Math.min(0.004, 0.0012 + st.stage * 0.00035)) aimShot(st, e.x, e.y + 4, bs * 0.9);
      } else if (e.type === 'moth') {
        e.x += e.dir * 0.9;
        e.y = e.enterY + Math.sin(e.x * 0.035 + e.phase) * 18;
        if (Math.abs(e.x - p.x) < 14 && st.rng() < 0.02 + st.stage * 0.004) aimShot(st, e.x, e.y, bs);
      } else if (e.type === 'dart') {
        if (e.state === 'aim') {
          e.y += 0.25; e.aimT--;
          if (e.aimT <= 0) {
            var dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
            e.vx = dx / d * 2.5; e.vy = dy / d * 2.5; e.state = 'dive';
          }
        } else { e.x += e.vx; e.y += e.vy; }
      } else if (e.type === 'spitter') {
        if (e.y < e.targetY) e.y += 0.7;
        else {
          e.x += Math.sin(e.t * 0.02 + e.phase) * 0.4;
          if (--e.cd <= 0) {
            e.cd = Math.max(70, 115 - st.stage * 5);
            var n = st.stage >= 4 ? 5 : 3, k;
            for (k = 0; k < n; k++) {
              var ang = Math.atan2((p.y - 14) - e.y, p.x - e.x) + (k - (n - 1) / 2) * 0.28;
              eShot(st, e.x, e.y + 4, Math.cos(ang) * bs, Math.sin(ang) * bs);
            }
            e.volleys--;
            if (e.volleys <= 0) e.leaving = true;
          }
        }
        if (e.leaving) e.y += 1.1;
      } else if (e.type === 'splitter') {
        e.y += 0.3;
        e.x += Math.sin(e.t * 0.025 + e.phase) * 0.5;
      } else if (e.type === 'mini') {
        e.x += e.vx; e.y += e.vy;
        e.vy = Math.min(e.vy + 0.012, 1.4);
        if (p.alive && e.x < p.x) e.vx = Math.min(e.vx + 0.008, 1.5);
        else e.vx = Math.max(e.vx - 0.008, -1.5);
      }
      // off screen
      if (e.y > st.H + 20 || e.y < -40 || e.x < -30 || e.x > st.W + 30) {
        st.enemies.splice(i, 1);
        continue;
      }
      // ram player
      if (p.alive && p.invuln <= 0) {
        var s = statsFor(p.stack);
        if (Math.abs(e.x - p.x) < (ENEMY[e.type].w + s.w) / 2 &&
            e.y + ENEMY[e.type].h > p.y - s.h && e.y < p.y) {
          hitPlayer(st);
          if (e.type !== 'splitter') { st.enemies.splice(i, 1); }
          else { e.hp = 0; killEnemy(st, i); }
          continue;
        }
      }
    }
  }

  function killEnemy(st, i) {
    var e = st.enemies[i], def = ENEMY[e.type];
    addScore(st, def.score);
    pop(st, e.x, e.y, '+' + def.score);
    burst(st, e.x, e.y + def.h / 2, e.type === 'splitter' ? 14 : 8, e.type === 'splitter', def.col);
    ev(st, 'explode');
    st.shake = Math.max(st.shake, e.type === 'splitter' ? 5 : 2);
    if (e.type === 'splitter') {
      for (var k = 0; k < 2; k++) {
        st.enemies.push({
          type: 'mini', t: 0, hp: ENEMY.mini.hp, x: e.x + (k ? 8 : -8), y: e.y,
          vx: k ? 1.3 : -1.3, vy: 0.5, fireT: 9999
        });
      }
    }
    st.enemies.splice(i, 1);
  }

  function hitPlayer(st) {
    var p = st.player;
    if (!p.alive || p.invuln > 0) return;
    var s = statsFor(p.stack);
    var lost = p.stack.shift();
    ev(st, 'playerhit');
    burst(st, p.x, p.y - s.h + 5, 16, true);
    st.shake = 8; st.flash = 4;
    st.ebullets.length = 0; // mercy clear
    if (p.stack.length === 0) {
      p.alive = false;
      st.phaseAfterDeath = st.phase;
      st.lives--;
      ev(st, 'modulelost', { last: true });
      st.phase = st.lives < 0 ? 'gameover' : 'dead';
      st.phaseT = 0;
      if (st.lives < 0) { ev(st, 'gameover'); if (st.score >= st.hi) st.hi = st.score; }
      else banner(st, 'ready', null, 80);
    } else {
      p.invuln = 100;
      ev(st, 'modulelost', { module: lost });
      banner(st, 'moduleLost', null, 70);
    }
  }

  function updatePlan(st) {
    var plan = st.plan;
    if (plan.gi >= plan.groups.length) return;
    var g = plan.groups[plan.gi];
    if (g.spawned < g.count) {
      if (--plan.t <= 0) {
        if (st.enemies.length < 15) {
          spawnEnemy(st, g);
          g.spawned++;
          plan.t = g.interval;
        } else plan.t = 10;
      }
    } else if (st.enemies.length === 0) {
      if (plan.restT === 0) plan.restT = 46;
      else if (--plan.restT <= 0) {
        plan.restT = 0;
        plan.gi++;
        if (plan.gi >= plan.groups.length) {
          // waves done -> boss
          st.phase = 'bossintro'; st.phaseT = 0;
          ev(st, 'warning');
        }
      }
    }
  }

  function firstMissingModule(stack) {
    for (var i = 0; i < ORDER.length; i++) if (stack.indexOf(ORDER[i]) < 0) return ORDER[i];
    return null;
  }

  function startDocking(st) {
    var kind = firstMissingModule(st.player.stack);
    if (!kind) { nextStage(st); return; }
    st.module = {
      kind: kind,
      x: st.W * 0.15 + st.rng() * st.W * 0.7, y: -20,
      baseX: 0, phase: st.rng() * 6.28, t: 0
    };
    st.module.baseX = st.module.x;
    st.phase = 'docking'; st.phaseT = 0;
  }

  function updateDocking(st) {
    var m = st.module, p = st.player;
    if (!m) {
      // dock just happened or module missed: pause, then next stage
      if (st.restT > 0) {
        st.restT--;
        if (st.restT === 0) nextStage(st);
      } else nextStage(st);
      return;
    }
    m.t++;
    m.y += 0.5;
    m.x = m.baseX + Math.sin(m.t * 0.03 + m.phase) * 14;
    var s = statsFor(p.stack);
    var mw = MOD[m.kind].w, mh = MOD[m.kind].h;
    if (p.alive &&
        Math.abs(m.x - p.x) < (mw + s.w) / 2 + 2 &&
        m.y + mh > p.y - s.h - 4 && m.y < p.y + 4) {
      // dock!
      var align = Math.abs(m.x - p.x);
      var bonus = align <= 3 ? 1000 : (align <= 8 ? 700 : 500);
      var perfect = align <= 3;
      p.stack.push(m.kind);
      p.stack.sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); });
      addScore(st, bonus);
      pop(st, p.x, p.y - s.h - 14, '+' + bonus);
      banner(st, perfect ? 'perfectDock' : 'docked', null, 80);
      ev(st, perfect ? 'dockperfect' : 'dock');
      burst(st, m.x, m.y + mh / 2, 12, false);
      st.module = null;
      st.phaseT = 0;
      st.restT = 60; // short pause then next stage
      return;
    }
    if (m.y > st.H + 16) {
      st.module = null;
      banner(st, 'dockMissed', null, 70);
      ev(st, 'dockfail');
      st.restT = 40;
    }
    // shared exit path
    if (!st.module && st.restT > 0) {
      st.restT--;
      if (st.restT === 0) nextStage(st);
    } else if (!st.module && st.restT === 0) {
      nextStage(st);
    }
  }

  function nextStage(st) {
    st.stage++;
    st.plan = { groups: composeStage(st.stage, st.rng), gi: 0, t: 30, restT: 0 };
    st.phase = 'waves'; st.phaseT = 0;
    banner(st, 'stage', st.stage, 110);
    st.module = null;
  }

  function bossShootFan(st, b) {
    var n = 3 + Math.min(Math.floor(st.stage / 2), 3);
    var bs = bulletSpeed(st.stage);
    var base = Math.atan2((st.player.y - 14) - b.y, st.player.x - b.x);
    for (var k = 0; k < n; k++) {
      var a = base + (k - (n - 1) / 2) * 0.22;
      eShot(st, b.x + Math.cos(a) * 10, b.y + 6, Math.cos(a) * bs * 1.1, Math.sin(a) * bs * 1.1);
    }
  }
  function bossShootWall(st, b) {
    var bs = bulletSpeed(st.stage);
    var gap = Math.floor(st.rng() * (b.w - 30)) - (b.w / 2 - 15);
    var gx = b.x + gap;
    for (var x = -b.w / 2 + 4; x <= b.w / 2 - 4; x += 9) {
      var px = b.x + x;
      if (Math.abs(px - gx) < 13) continue;
      eShot(st, px, b.y + b.h / 2, 0, bs * 0.8);
    }
  }
  function bossShootSpiral(st, b) {
    var bs = bulletSpeed(st.stage), n = 10;
    for (var k = 0; k < n; k++) {
      var a = b.spiralA + k * (Math.PI * 2 / n);
      eShot(st, b.x, b.y, Math.cos(a) * bs * 0.9, Math.sin(a) * bs * 0.9);
    }
    b.spiralA += 0.45;
  }

  function updateBoss(st) {
    var b = st.boss;
    if (!b) return;
    b.t++;
    if (b.flash > 0) b.flash--;
    if (b.dead) {
      b.deathT--;
      if (b.deathT % 7 === 0) {
        burst(st, b.x + (st.rng() - 0.5) * b.w, b.y + (st.rng() - 0.5) * b.h, 12, true);
        ev(st, 'explode');
        st.shake = 7;
      }
      if (b.deathT <= 0) {
        st.boss = null;
        var bonus = 1000 + 500 * st.stage;
        addScore(st, bonus);
        pop(st, st.W / 2, st.H * 0.19, '+' + bonus);
        st.ebullets.length = 0;
        banner(st, 'clear', st.stage, 150);
        ev(st, 'stageclear');
        st.clearT = 150;
        st.bonusLeft = 300 + 200 * st.stage;
        st.phase = 'clear'; st.phaseT = 0;
      }
      return;
    }
    var speedMul = (b.hp < b.maxHp * 0.35 ? 1.5 : 1);
    var cdMul = (b.hp < b.maxHp * 0.35 ? (st.stage >= 3 ? 0.75 : 0.6) : 1);
    if (b.tier === 2) {
      // serpent: head leads a slow slither, segments follow by arc length
      var hx = st.W / 2 + Math.sin(b.t * 0.045 * speedMul) * (st.W * 0.35);
      var hy = st.H * 0.175 + Math.sin(b.t * 0.021) * (st.H * 0.08);
      if (!b.trailD) b.trailD = 0;
      b.trailD += Math.sqrt((hx - b.x) * (hx - b.x) + (hy - b.y) * (hy - b.y));
      b.trail.unshift({ x: hx, y: hy, d: b.trailD });
      if (b.trail.length > 700) b.trail.pop();
      b.x = hx; b.y = hy;
      for (var si = 0; si < b.segs.length; si++) {
        var want = b.trailD - (si + 1) * 9;
        var pt = b.trail[b.trail.length - 1];
        for (var ti2 = 0; ti2 < b.trail.length; ti2++) {
          if (b.trail[ti2].d < want) break; // reached points older than wanted
          pt = b.trail[ti2];
        }
        b.segs[si].x = pt.x; b.segs[si].y = pt.y;
      }
      if (--b.coolFan <= 0) {
        b.coolFan = Math.max(50, (100 - st.stage * 4)) * cdMul;
        aimShot(st, b.x, b.y + 5, bulletSpeed(st.stage) * 1.15);
        if (st.stage >= 5) {
          var mid = b.segs[Math.floor(b.segs.length / 2)];
          if (mid) aimShot(st, mid.x, mid.y + 5, bulletSpeed(st.stage));
        }
      }
    } else {
      // hull bosses slide in then sway
      var hoverY = st.H * 0.163;
      if (b.y < hoverY) b.y += 0.6;
      else {
        var rx = (st.W - b.w) / 2 - 4;
        b.x = st.W / 2 + Math.sin(b.t * (0.012 + 0.0018 * st.stage) * speedMul) * rx;
        b.y = hoverY + Math.sin(b.t * 0.021) * 5;
      }
      if (b.tier === 3 && b.turrets) {
        for (var ti = 0; ti < b.turrets.length; ti++) {
          var tu = b.turrets[ti];
          tu.x = b.x + tu.dx * b.w; tu.y = b.y + b.h * 0.55;
          if (tu.hp > 0 && --tu.cd <= 0) {
            tu.cd = Math.max(46, 80 - st.stage * 3) * cdMul;
            aimShot(st, tu.x, tu.y + 4, bulletSpeed(st.stage) * 1.2);
          }
        }
      }
      if (--b.coolFan <= 0) {
        b.coolFan = Math.max(55, (95 - st.stage * 4)) * cdMul;
        bossShootFan(st, b);
      }
      if (st.stage >= 2 && --b.coolWall <= 0) {
        b.coolWall = Math.max(90, (150 - st.stage * 5)) * cdMul;
        bossShootWall(st, b);
      }
      if (st.stage >= 3 && --b.coolSpiral <= 0) {
        b.coolSpiral = Math.max(120, (190 - st.stage * 6)) * cdMul;
        bossShootSpiral(st, b);
        bossShootSpiral(st, b); // double burst
      }
    }
  }

  function damageBoss(st, dmg) {
    var b = st.boss;
    if (!b || b.dead) return;
    b.hp -= dmg;
    b.flash = 3;
    ev(st, 'bosshit');
    if (b.hp <= 0) {
      b.dead = true; b.deathT = 56;
      ev(st, 'bigexplode');
      st.shake = 10;
      // the swarm dies with its boss
      for (var ei = st.enemies.length - 1; ei >= 0; ei--) {
        burst(st, st.enemies[ei].x, st.enemies[ei].y, 6, false);
        st.enemies.splice(ei, 1);
      }
      st.ebullets.length = 0;
    }
  }

  function updateBullets(st) {
    var p = st.player, i, j;
    // player bullets
    for (i = st.pbullets.length - 1; i >= 0; i--) {
      var pb = st.pbullets[i];
      pb.x += pb.vx; pb.y += pb.vy;
      if (pb.y < -10 || pb.x < -10 || pb.x > st.W + 10) { st.pbullets.splice(i, 1); continue; }
      var consumed = false;
      // vs enemies
      for (j = st.enemies.length - 1; j >= 0; j--) {
        var e = st.enemies[j], def = ENEMY[e.type];
        if (Math.abs(pb.x - e.x) < def.w / 2 + 1 && pb.y < e.y + def.h && pb.y + 6 > e.y) {
          e.hp -= pb.dmg;
          consumed = true;
          if (e.hp <= 0) killEnemy(st, j);
          else { ev(st, 'hit'); st.parts.push({ x: pb.x, y: pb.y, vx: 0, vy: -0.5, life: 6, c: 'W', sz: 3, flashP: true }); }
          break;
        }
      }
      if (consumed) { st.pbullets.splice(i, 1); continue; }
      // vs boss
      var b = st.boss;
      if (b && !b.dead) {
        if (b.tier === 2) {
          for (j = 0; j < b.segs.length; j++) {
            var sg = b.segs[j];
            if (sg.hp > 0 && Math.abs(pb.x - sg.x) < 8 && pb.y < sg.y + 8 && pb.y + 6 > sg.y - 8) {
              sg.hp -= pb.dmg; b.hp -= pb.dmg; b.flash = 3;
              consumed = true;
              if (sg.hp <= 0) {
                burst(st, sg.x, sg.y, 10, true);
                ev(st, 'explode');
                addScore(st, 120); pop(st, sg.x, sg.y, '+120');
              }
              if (b.hp <= 0) { b.dead = true; b.deathT = 56; ev(st, 'bigexplode'); st.shake = 10; }
              break;
            }
          }
        } else {
          // turrets first
          if (b.turrets) {
            for (j = 0; j < b.turrets.length; j++) {
              var tu = b.turrets[j];
              if (tu.hp > 0 && Math.abs(pb.x - tu.x) < 6 && pb.y < tu.y + 5 && pb.y + 6 > tu.y - 5) {
                tu.hp -= pb.dmg; consumed = true; b.flash = 2;
                if (tu.hp <= 0) {
                  burst(st, tu.x, tu.y, 10, true);
                  addScore(st, 300); pop(st, tu.x, tu.y, '+300');
                  ev(st, 'explode');
                }
                break;
              }
            }
          }
          if (!consumed && Math.abs(pb.x - b.x) < b.w / 2 && pb.y < b.y + b.h / 2 && pb.y + 6 > b.y - b.h / 2) {
            damageBoss(st, pb.dmg);
            consumed = true;
          }
        }
        if (consumed) { st.pbullets.splice(i, 1); continue; }
      }
    }
    // enemy bullets
    if (p.alive) {
      var s = statsFor(p.stack);
      for (i = st.ebullets.length - 1; i >= 0; i--) {
        var eb = st.ebullets[i];
        eb.x += eb.vx; eb.y += eb.vy;
        if (eb.y > st.H + 8 || eb.y < -8 || eb.x < -8 || eb.x > st.W + 8) { st.ebullets.splice(i, 1); continue; }
        if (p.invuln <= 0 &&
            Math.abs(eb.x - p.x) < s.w / 2 + 1 &&
            eb.y > p.y - s.h - 1 && eb.y < p.y + 2) {
          st.ebullets.splice(i, 1);
          hitPlayer(st);
          break;
        }
      }
    } else {
      for (i = st.ebullets.length - 1; i >= 0; i--) {
        var eb2 = st.ebullets[i];
        eb2.x += eb2.vx; eb2.y += eb2.vy;
        if (eb2.y > st.H + 8 || eb2.y < -8 || eb2.x < -8 || eb2.x > st.W + 8) st.ebullets.splice(i, 1);
      }
    }
  }

  function updateFx(st) {
    for (var i = st.parts.length - 1; i >= 0; i--) {
      var q = st.parts[i];
      q.x += q.vx; q.y += q.vy;
      q.vx *= 0.93; q.vy *= 0.93;
      q.life--;
      if (q.life <= 0) st.parts.splice(i, 1);
    }
    for (i = st.pops.length - 1; i >= 0; i--) {
      var pp = st.pops[i];
      pp.y -= 0.5; pp.life--;
      if (pp.life <= 0) st.pops.splice(i, 1);
    }
    if (st.shake > 0) st.shake--;
    if (st.flash > 0) st.flash--;
    if (st.banner && st.banner.t > 0) st.banner.t--;
  }

  // ------------------------------------------------------------------ step
  function step(st, input) {
    input = input || {};
    st.frame++;
    st.phaseT++;
    var p = st.player;

    if (st.phase === 'gameover') {
      updateFx(st);
      return;
    }

    if (st.phase === 'dead') {
      updateFx(st);
      updateEnemies(st);
      updateBullets(st);
      if (st.phaseT > 96) {
        p.alive = true; p.stack = ['F']; p.x = st.W / 2; p.y = st.H - 30;
        p.invuln = 140; p.cool = 0;
        st.ebullets.length = 0;
        st.phase = st.phaseAfterDeath || 'waves';
        st.phaseT = 0;
        banner(st, 'ready', null, 60);
      }
      return;
    }

    if (st.phase === 'waves') {
      updatePlayer(st, input);
      updatePlan(st);
      updateEnemies(st);
      updateBullets(st);
      updateFx(st);
    } else if (st.phase === 'bossintro') {
      updatePlayer(st, input);
      updateEnemies(st);
      updateBullets(st);
      updateFx(st);
      if (st.phaseT === 1) banner(st, 'warning', null, 130);
      if (st.phaseT > 130) {
        st.boss = makeBoss(st.stage, st.W);
        st.phase = 'boss'; st.phaseT = 0;
        banner(st, 'bossName', st.boss.name, 90);
      }
    } else if (st.phase === 'boss') {
      updatePlayer(st, input);
      updateEnemies(st);
      updateBoss(st);
      updateBullets(st);
      updateFx(st);
    } else if (st.phase === 'docking') {
      updatePlayer(st, input);
      updateDocking(st);
      updateFx(st);
    } else if (st.phase === 'clear') {
      updatePlayer(st, input);
      updateFx(st);
      st.clearT--;
      if (st.clearT === 100 && st.bonusLeft > 0) { addScore(st, st.bonusLeft); pop(st, st.W / 2, st.H * 0.375, '+' + st.bonusLeft); }
      if (st.clearT <= 0) {
        if (firstMissingModule(p.stack)) startDocking(st);
        else {
          var fb = 500 + 100 * st.stage;
          addScore(st, fb);
          pop(st, st.W / 2, st.H * 0.375, '+' + fb);
          banner(st, 'fullShip', null, 80);
          nextStage(st);
        }
      }
    }
  }

  var Engine = {
    W: W, H: H, HUD_H: HUD_H,
    MOD: MOD, ORDER: ORDER, ENEMY: ENEMY, BOSS_NAMES: BOSS_NAMES,
    createGame: createGame,
    step: step,
    statsFor: statsFor,
    composeStage: composeStage,
    makeBoss: makeBoss,
    firstMissingModule: firstMissingModule,
    mulberry32: mulberry32,
    _hitPlayer: hitPlayer
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else global.DOCKSTAR_ENGINE = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
