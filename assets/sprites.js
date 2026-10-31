/* DOCKSTAR - pixel sprites (pure maps, browser + Node) + canvas atlas (browser).
   Palette (manga ink & vermillion): W white, G light gray, D dark gray,
   R vermillion red, r dark red, K ink black. */
(function (global) {
  'use strict';

  // ---- player modules -------------------------------------------------
  // F "STINGER" fighter (top module) 9x10
  var FIGHTER = [
    '....W....',
    '...WWW...',
    '...WRW...',
    '...WRW...',
    '..WWRWW..',
    '..WWWWW..',
    '.WWWWWWW.',
    '.W.WWW.W.',
    'WW.WWW.WW',
    'W...W...W'
  ];
  // C "CRUISER" mid module 15x11
  var CRUISER = [
    '......WWW......',
    '.....WWWWW.....',
    '..W..WRWRW..W..',
    '.WWW.WWWWW.WWW.',
    '.WWWWWWWWWWWWW.',
    'WWWWRWWWWWRWWWW',
    'WWWWWWWWWWWWWWW',
    'W.WWWWWWWWWWW.W',
    'W..WWW...WWW..W',
    '...WW.....WW...',
    '....W.....W....'
  ];
  // R "REACTOR" base module 17x10
  var REACTOR = [
    '.....WWWWWWWWW.....',
    '....WWWWWWWWWWW....',
    '.W.WWWWWWWWWWWWW.W.',
    'WWWWWRRWWWWRRWWWWW.',
    'WWWWWRRWWWWRRWWWWW.',
    'WW.WWWWWWWWWWWWW.WW',
    'W...WWW.WWW.WWW...W',
    'W...WW...WW...W...W',
    '....W.....W.....W..',
    '...WW.....WW.....W.'
  ];
  // engine flames (2 frames, drawn under the bottom module)
  var FLAME1 = [
    '..R..',
    '.RRR.',
    '.RWR.',
    'RWRWR',
    '.RWR.',
    '..R..'
  ];
  var FLAME2 = [
    '.R.R.',
    '..R..',
    '.RWR.',
    'RWWR.',
    '.RRR.',
    '..R..'
  ];

  // ---- enemies (red army) ---------------------------------------------
  var DRONE1 = [
    '...WWW...',
    '..RRRRR..',
    '.RRRRRRR.',
    'RR.WWW.RR',
    '.RRRRRRR.',
    '..RRRRR..',
    '...R.R...'
  ];
  var DRONE2 = [
    '...WWW...',
    '..RRRRR..',
    '.RRWWWRR.',
    'RR.WWW.RR',
    '.RRRRRRR.',
    '..RRRRR..',
    '...R.R...'
  ];
  var MOTH1 = [
    '..R.......R..',
    '..RR.....RR..',
    '..RRR.W.RRR..',
    '..RRRWWRRRR..',
    '...RRWWWRR...',
    '....RRRRR....',
    '.....RRR.....',
    '....RR.RR....',
    '...R.....R...'
  ];
  var MOTH2 = [
    '.............',
    '..RR.....RR..',
    '...RR.W.RR...',
    '...RRRWRRR...',
    '..RRRWWWRRR..',
    '.RRRRWWWRRRR.',
    'RR..RRRRR..RR',
    '.....RRR.....',
    '....R...R....'
  ];
  var DART = [
    '...R...',
    '..RRR..',
    '..RRR..',
    '.RRWRR.',
    '.RRWRR.',
    '.RRRRR.',
    'RRRRRRR',
    '.RRRRR.',
    '..RRR..',
    '...R...'
  ];
  var SPITTER1 = [
    '...RRRRR...',
    '..RRRRRRR..',
    '.RR.WWW.RR.',
    '.RRWWWRRRR.',
    'RRRWWWWRRRR',
    '.RRRWWWRRR.',
    '.RRRRRRRRR.',
    '..RRRRRRR..',
    '...R.R.R...',
    '...........'
  ];
  var SPITTER2 = [
    '...RRRRR...',
    '..RRRRRRR..',
    '.RR.WWW.RR.',
    'RRRWWWRRRR.',
    'RRRWWRWWRRR',
    '.RRRWWWRRR.',
    '.RRRRRRRRR.',
    '..RRRRRRR..',
    '...R.R.R...',
    '...........'
  ];
  var SPLITTER = [
    '.....RRRRR.....',
    '...RRRRRRRRR...',
    '..RRRRWWWRRRR..',
    '..RRWWWWWWWRR..',
    '.RRRWWWWWWWRRR.',
    '.RRRWWWWWWWRRR.',
    'RRRWWRRRRRWWRRR',
    'RRRRWRRRRRWRRRR',
    '.RRRRRRRRRRRRR.',
    '..RRRRRRRRRRR..',
    '..RR..RRR..RR..',
    '.R....R.R....R.',
    '...............'
  ];
  var MINI1 = [
    '..RRR..',
    '.RWWR..',
    'RRWWWRR',
    '.RRRRR.',
    '..RRR..',
    '..R.R..',
    '.......'
  ];
  var MINI2 = [
    '..RRR..',
    '.RRWWR.',
    'RRWWWRR',
    'RRRRRRR',
    '.RRRRR.',
    '..R.R..',
    '.......'
  ];

  // ---- serpent boss ----------------------------------------------------
  var SEGHEAD = [
    '....RRRRR....',
    '..RRRRRRRRR..',
    '.RRRRWWWRRRR.',
    '.RRWWWWWWWRR.',
    'RRRWWWWWWWRRR',
    'RRRWRWWWRWRRR',
    'RRRWWWWWWWRRR',
    '.RRRRWWWRRRR.',
    '.RRRRRRRRRRR.',
    '..RRRRRRRRR..',
    '....RR.RR....',
    '.....R.R.....',
    '.............'
  ];
  var SEG1 = [
    '...RRRRR...',
    '..RRRRRRR..',
    '.RRRWWWRRR.',
    '.RRWWWWWRR.',
    'RRRWWWWWRRR',
    'RRRWWWWWRRR',
    '.RRWWWWWRR.',
    '.RRRWWWRRR.',
    '..RRRRRRR..',
    '...RRRRR...',
    '...........'
  ];
  var SEG2 = [
    '...RRRRR...',
    '..RRWWRrr..',
    '.RRWWWRRRR.',
    '.RRWWWrrRR.',
    'RRRWWrrWRRR',
    'RRRWWrrWRRR',
    '.RRWWWrrRR.',
    '.RRWWWRRRR.',
    '..RRWWRrr..',
    '...RRRRR...',
    '...........'
  ];

  // ---- boss parts -------------------------------------------------------
  var CORE = [
    '..RRR..',
    '.RWWR..',
    'RWWWRR.',
    'RWWWRRR',
    'RWWWRR.',
    '.RWWR..',
    '..RRR..'
  ];
  var TURRET = [
    '....R....',
    '....R....',
    '..DDDDD..',
    '.DDWGWDD.',
    '.DDWGWDD.',
    '.DDDDDDD.',
    '.DDDDDDD.',
    '..DDDDD..',
    '.........'
  ];

  var MAPS = {
    fighter: FIGHTER, cruiser: CRUISER, reactor: REACTOR,
    flame1: FLAME1, flame2: FLAME2,
    drone1: DRONE1, drone2: DRONE2,
    moth1: MOTH1, moth2: MOTH2,
    dart: DART,
    spitter1: SPITTER1, spitter2: SPITTER2,
    splitter: SPLITTER, mini1: MINI1, mini2: MINI2,
    seghead: SEGHEAD, seg1: SEG1, seg2: SEG2,
    core: CORE, turret: TURRET
  };

  var COLORS = {
    W: '#ffffff', G: '#c9c9c9', D: '#6f6f6f',
    R: '#e0301e', r: '#8f1d12', K: '#0a0a0a'
  };

  var Sprites = {
    maps: MAPS,
    colors: COLORS,
    size: function (name) {
      var m = MAPS[name];
      return { w: m[0].length, h: m.length };
    },
    // validate: every row same width, only palette chars (used by tests)
    validate: function () {
      var problems = [];
      Object.keys(MAPS).forEach(function (name) {
        var m = MAPS[name], w = null;
        for (var i = 0; i < m.length; i++) {
          if (w === null) w = m[i].length;
          else if (m[i].length !== w) problems.push(name + ' row ' + i + ' width ' + m[i].length + ' != ' + w);
          for (var j = 0; j < m[i].length; j++) {
            var c = m[i].charAt(j);
            if (c !== '.' && !COLORS[c]) problems.push(name + ' row ' + i + ' bad char "' + c + '"');
          }
        }
      });
      return problems;
    }
  };

  // Browser: build canvas atlas.
  if (typeof document !== 'undefined') {
    Sprites.build = function () {
      Sprites.canvas = {};
      Object.keys(MAPS).forEach(function (name) {
        var m = MAPS[name], w = m[0].length, h = m.length;
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var x = c.getContext('2d');
        for (var i = 0; i < h; i++) {
          for (var j = 0; j < w; j++) {
            var ch = m[i].charAt(j);
            if (ch === '.') continue;
            x.fillStyle = COLORS[ch];
            x.fillRect(j, i, 1, 1);
          }
        }
        Sprites.canvas[name] = c;
      });
    };
    Sprites.draw = function (ctx, name, x, y) {
      if (!Sprites.canvas) Sprites.build();
      ctx.drawImage(Sprites.canvas[name], Math.round(x), Math.round(y));
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Sprites;
  else global.DOCKSTAR_SPRITES = Sprites;
})(typeof window !== 'undefined' ? window : globalThis);
