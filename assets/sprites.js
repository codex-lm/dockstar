/* DOCKSTAR - pixel sprites (pure maps, browser + Node) + canvas atlas (browser).
   v1.1 color edition: one color family per enemy type, bigger shaded sprites.
   Chars: W white, G light gray, D dark gray, K ink, R vermillion, r dark red,
   C/c cyan, M/m magenta, Y/y amber, V/v green, P/p purple, O/o orange,
   B/b steel blue. */
(function (global) {
  'use strict';

  // ---- player modules (white hull, vermillion trim, cyan glows) ---------
  var FIGHTER = [
    '.....W.....',
    '.....C.....',
    '....WWW....',
    '....WRW....',
    '....WRW....',
    '...WWRWW...',
    '...WWWWW...',
    '..WWWWWWW..',
    '.WWW.W.WWW.',
    'WWW..W..WWW',
    'WW...W...WW',
    'W....W....W'
  ];
  var CRUISER = [
    '.......WWW.......',
    '......WWWWW......',
    '..C..WWWWWWW..C..',
    '.WWW.WWRWRWW.WWW.',
    'WWWWWWRRWRRWWWWWW',
    'WWWWWWWWWWWWWWWWW',
    'WWCWWWWWWWWWWWCWW',
    'WWWWWWWWWWWWWWWWW',
    'W.WWWWWWWWWWWWW.W',
    'W...WWW...WWW...W',
    '...WW...W...WW...',
    '....W...W...W....',
    '...W....W....W...'
  ];
  var REACTOR = [
    '.....WWWWWWWWW.....',
    '....WWWWWWWWWWW....',
    '..W.WWWWWWWWWWW.W..',
    '.WWWWRRWWWWWRRWWWW.',
    'WWWWWRRWWWWWRRWWWWW',
    'WWWWWWWWWWWWWWWWWWW',
    'WW.WWWWW.WWW.WWW.WW',
    'W...W....W....W...W',
    '.W..W....W....W..W.',
    '.WWWW....W....WWWW.',
    '..W.............W..',
    '...W.....W.....W...'
  ];
  var FLAME1 = [
    '..O..',
    '.OOO.',
    '.OYO.',
    'OYWYO',
    '.OYO.',
    '.OOO.',
    '..O..'
  ];
  var FLAME2 = [
    '.O.O.',
    '..O..',
    '.OYO.',
    'OYWO.',
    '.YYY.',
    '.OOO.',
    '..O..'
  ];

  // ---- enemies: one color family each ----------------------------------
  var DRONE1 = [
    '....WWWW....',
    '...CCCCCC...',
    '..CCWWCCWC..',
    '.CC.WWWW.CC.',
    'CCCCWWWWCCCC',
    '.CCCCCCCCCC.',
    '..ccCCCCcc..',
    '...cccccc...',
    '....c..c....',
    '............'
  ];
  var DRONE2 = [
    '....WWWW....',
    '...CCCCCC...',
    '..CCCWWCCC..',
    '.CC.WWCC.CC.',
    'CCCCWWWWCCCC',
    '.CCCWWWWCCC.',
    '..ccCCCCcc..',
    '...cccccc...',
    '....c..c....',
    '............'
  ];
  var MOTH1 = [
    '..M.........M..',
    '..MM.......MM..',
    '..MMM..W..MMM..',
    '..MMMMWWWMMMM..',
    '...MMMWWWMMM...',
    '....MMWWMMM....',
    '.....MWWWM.....',
    '....MM.W.MM....',
    '...M..MMM..M...',
    '..m...m.m...m..',
    '...............'
  ];
  var MOTH2 = [
    '...............',
    '..MM.......MM..',
    '...MM..W..MM...',
    '...MMMWWWMMM...',
    '..MMMMWWWMMMM..',
    '.MMMMWWWWMMMMM.',
    'MM...MWWWM...MM',
    '.....M.W.M.....',
    '....M.MMM.M....',
    '...m..m.m..m...',
    '...............'
  ];
  var DART = [
    '....Y....',
    '...YYY...',
    '...YWY...',
    '...YYY...',
    '..YYYYY..',
    '..YWYWY..',
    '..YYYYY..',
    '.YYyYyYY.',
    '.YYYYYYY.',
    'YYyYYYyYY',
    '.YYYYYYY.',
    '..YYYYY..',
    '...y.y...'
  ];
  var SPITTER1 = [
    '....VVVVVV....',
    '..VVVVVVVVVV..',
    '.VVV.WWWW.VVV.',
    '.VV.WWWWWW.VV.',
    'VVVVWWWWWWVVVV',
    'VVVVWWKKWWVVVV',
    'VVVVVWWWWVVVVV',
    '.VVVVVVVVVVVV.',
    '.VVvvVVVVvvVV.',
    '..VvVVVVVVvV..',
    '...V..VV..V...',
    '....v.VV.v....',
    '..............'
  ];
  var SPITTER2 = [
    '....VVVVVV....',
    '..VVVVVVVVVV..',
    '.VVV.WWWW.VVV.',
    'VVV.WWKKWW.VVV',
    'VVVWWWKKWWWVVV',
    'VVVVWWKKWWVVVV',
    'VVVVVWWWWVVVVV',
    '.VVVVVVVVVVVV.',
    '.VVvvVVVVvvVV.',
    '..VvVVVVVVvV..',
    '...V..VV..V...',
    '....v.VV.v....',
    '..............'
  ];
  var SPLITTER = [
    '......PPPPPP......',
    '....PPPPPPPPPP....',
    '...PPPPWWPPPPPP...',
    '..PPPWWWWWWWWPPP..',
    '..PPWWWWWWWWWWPP..',
    '.PPPWWWPPPPWWWPPP.',
    '.PPWWWPpppPWWWWPP.',
    'PPPWWWPpppPWWWWPPP',
    'PPPWWWPpppPWWWWPPP',
    '.PPWWWWPPPPWWWWPP.',
    '..PPWWWWWWWWWWPP..',
    '..PPPPWWWWWWPPPP..',
    '...PPPPPPPPPPPP...',
    '....ppP.PPP.pp....',
    '...p...PP.PP...p..',
    '.......p..p.......'
  ];
  var MINI1 = [
    '..PPPP..',
    '.PPPPPP.',
    'PPWWWWPP',
    'PPWWWWPP',
    '.PPWWPP.',
    '..PPPP..',
    '.p.PP.p.',
    '..p..p..',
    '........'
  ];
  var MINI2 = [
    '..PPPP..',
    '.PPPPPP.',
    'PPWPPWPP',
    'PPWWWWPP',
    '.PPWWPP.',
    '..PPPP..',
    '.p.PP.p.',
    '..p..p..',
    '........'
  ];

  // ---- serpent boss (orange) --------------------------------------------
  var SEGHEAD = [
    '.....OOOO.....',
    '...OOOOOOOO...',
    '..OOOWWWWOOO..',
    '.OOWWWWWWWWOO.',
    '.OOWWWWWWWWWO.',
    'OOKWWWWWWWWKOO',
    'OOWWOOOOOOWWOO',
    'OOWWOOOOOOWWOO',
    '.OOWWOOOOWWOO.',
    '.OOOWWWWWWOOO.',
    '..OOOOOOOOOO..',
    '...OO.OO.OO...',
    '....O.O..O....',
    '.....o...o....',
    '..............',
    '..............'
  ];
  var SEG1 = [
    '....OOOO....',
    '..OOOOOOOO..',
    '.OOOWWWWOOO.',
    '.OOWWWWWWOO.',
    'OOWWWWWWWWOO',
    'OOWWOOOOWWOO',
    'OOWWOOOOWWOO',
    '.OOWWWWWWOO.',
    '.OOOWWWWOOO.',
    '..OOOOOOOO..',
    '...OO..OO...',
    '..o......o..',
    '............',
    '............'
  ];
  var SEG2 = [
    '....OOOO....',
    '..OOOOOOOO..',
    '.OOOoWWWOOO.',
    '.OOWWoWWWOO.',
    'OOWWooWWWWOO',
    'OOWoOOOOWWOO',
    'OOWoWWoWWWOO',
    '.OOWWoWWWOO.',
    '.OOOoWOOOOO.',
    '..OOOOOOOO..',
    '...OO..OO...',
    '..o......o..',
    '............',
    '............'
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
    '.DDGWGDD.',
    '.DDGWGDD.',
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
    W: '#ffffff', G: '#c9c9c9', D: '#6f6f6f', K: '#0a0a0a',
    R: '#e0301e', r: '#8f1d12',
    C: '#35e0e8', c: '#177f8c',
    M: '#ef5bb7', m: '#8f2a6a',
    Y: '#f7c948', y: '#a97e1c',
    V: '#45e06e', v: '#1e8a3c',
    P: '#a678f7', p: '#5c3aa0',
    O: '#ff8c1a', o: '#b0560e',
    B: '#4f9be0', b: '#2a5e94'
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
