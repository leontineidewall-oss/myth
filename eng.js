// myth pixel engine: one source for the hero scene, god icons, the share card (/api/og) and the favicon.
// inlined into index.html by build.py, required by the api functions in node.
(function (root) {
  var C = {
    ol: 0x1a0f08, white: 0xffffff,
    g0: 0xfff6c8, g1: 0xffe27a, g2: 0xffd34d, g3: 0xf0b030, g4: 0xe0a530, g5: 0xa8681a, g6: 0x6a3e0e, g7: 0x5a320a,
    cream: 0xfff1c8, shade: 0x1a0f30
  };
  var SKY = [0x0e0a20, 0x130d2a, 0x191036, 0x211444, 0x2c1852, 0x3a1d5e, 0x4d2266, 0x63286c, 0x7c2f70, 0x983872, 0xb44672, 0xcf5a70];
  var GODS = {
    zeus: { c: 0x5a8cff, d: 0x2f56e0 }, poseidon: { c: 0x38e0d0, d: 0x14948a },
    hades: { c: 0xb06aff, d: 0x6a2fc0 }, hermes: { c: 0x5ef09a, d: 0x1f9a56 }
  };

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6d2b79f5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function Grid(w, h, bg) { this.w = w; this.h = h; this.px = new Int32Array(w * h).fill(bg == null ? -1 : bg); }
  Grid.prototype.set = function (x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c == null || c < 0) return;
    this.px[y * this.w + x] = c;
  };
  Grid.prototype.get = function (x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.px[y * this.w + x]; };
  Grid.prototype.rgba = function (out) {
    for (var i = 0; i < this.px.length; i++) {
      var c = this.px[i];
      if (c < 0) { out[i * 4 + 3] = 0; continue; }
      out[i * 4] = (c >> 16) & 255; out[i * 4 + 1] = (c >> 8) & 255; out[i * 4 + 2] = c & 255; out[i * 4 + 3] = 255;
    }
    return out;
  };

  // a layer of cells (key = y*65536+x) drawn with a 1px outline and optional drop shadow
  function Layer() { this.m = new Map(); }
  Layer.prototype.put = function (x, y, c) { x = Math.floor(x); y = Math.floor(y); this.m.set(y * 65536 + x, c); };
  Layer.prototype.has = function (x, y) { return this.m.has(y * 65536 + x); };
  Layer.prototype.draw = function (g, ol, shadow, sdx, sdy) {
    var self = this;
    if (shadow != null) this.m.forEach(function (c, k) { var x = k % 65536, y = Math.floor(k / 65536); if (!self.has(x + sdx, y + sdy)) g.set(x + sdx, y + sdy, shadow); });
    if (ol != null) this.m.forEach(function (c, k) {
      var x = k % 65536, y = Math.floor(k / 65536);
      if (!self.has(x + 1, y)) g.set(x + 1, y, ol); if (!self.has(x - 1, y)) g.set(x - 1, y, ol);
      if (!self.has(x, y + 1)) g.set(x, y + 1, ol); if (!self.has(x, y - 1)) g.set(x, y - 1, ol);
    });
    this.m.forEach(function (c, k) { g.set(k % 65536, Math.floor(k / 65536), c); });
  };

  function inPoly(x, y, pts) {
    var ins = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }

  // ---------- sky
  function sky(g, horizon) {
    var n = SKY.length, edges = [];
    for (var i = 0; i <= n; i++) edges.push(Math.floor(horizon * Math.pow(i / n, 0.8)));
    for (i = 0; i < n; i++) {
      for (var y = edges[i]; y < edges[i + 1]; y++) for (var x = 0; x < g.w; x++) g.set(x, y, SKY[i]);
      if (i + 1 < n) { y = edges[i + 1] - 1; for (x = 0; x < g.w; x++) if ((x + y) % 2 === 1) g.set(x, y, SKY[i + 1]); }
    }
    for (y = horizon; y < g.h; y++) for (x = 0; x < g.w; x++) g.set(x, y, SKY[n - 1]);
  }
  function stars(g, n, ymax, seed, t) {
    var r = rng(seed), cols = [0xffffff, 0xc9bff0, 0x8f84c8];
    for (var i = 0; i < n; i++) {
      var x = Math.floor(r() * g.w), y = Math.floor(r() * ymax), c = cols[Math.floor(r() * 3)], ph = r() * 6.28;
      if (t != null && Math.sin(t * 1.7 + ph) < -0.7) continue;
      g.set(x, y, c);
    }
  }
  function twinkle(g, x, y, big, on) {
    if (on === false) { g.set(x, y, 0xffffff); return; }
    var L = big ? 3 : 2;
    for (var d = 1; d <= L; d++) {
      var c = d === 1 ? 0xffffff : 0xffe9a0;
      g.set(x + d, y, c); g.set(x - d, y, c); g.set(x, y + d, c); g.set(x, y - d, c);
    }
    g.set(x, y, 0xffffff);
  }

  // ---------- olympus
  function ridge(w, base, peaks) {
    var out = [];
    for (var x = 0; x < w; x++) {
      var v = base;
      for (var i = 0; i < peaks.length; i++) { var p = peaks[i]; v = Math.min(v, base - p[1] * Math.max(0, 1 - Math.abs(x - p[0]) / p[2])); }
      out.push(Math.floor(v));
    }
    return out;
  }
  function mountains(g, peaks, base, lit, dark, snow, snowline) {
    var h = ridge(g.w, base, peaks);
    for (var x = 0; x < g.w; x++) {
      var best = peaks[0], bv = -1;
      for (var i = 0; i < peaks.length; i++) { var p = peaks[i], v = p[1] * Math.max(0, 1 - Math.abs(x - p[0]) / p[2]); if (v > bv) { bv = v; best = p; } }
      var left = x <= best[0];
      for (var y = h[x]; y < g.h; y++) {
        var c = left ? lit : dark;
        if (snow && h[x] < snowline && y < h[x] + 3 + (x % 3 === 0 ? 1 : 0)) c = left ? snow[0] : snow[1];
        g.set(x, y, c);
      }
    }
  }

  // ---------- clouds
  function cloud(g, cx, cy, w, h, seed) {
    var r = rng(seed), n = Math.max(3, Math.floor(w / 10)), blobs = [];
    for (var i = 0; i < n; i++) blobs.push([cx - w / 2 + (i + 0.5) * w / n + (r() * 4 - 2), cy + (r() * 3 - 2), h * (1 - Math.abs((i + 0.5) / n - 0.5) * 1.1) * (0.85 + r() * 0.3)]);
    var L = new Layer(), cells = [];
    for (var y = Math.floor(cy - h * 1.3); y < Math.floor(cy + h * 0.45); y++)
      for (var x = Math.floor(cx - w / 2 - h); x < Math.floor(cx + w / 2 + h); x++) {
        for (var b = 0; b < blobs.length; b++) {
          var B = blobs[b];
          if ((x - B[0]) * (x - B[0]) + (y - B[1]) * (y - B[1]) * 1.5625 <= B[2] * B[2]) { L.put(x, y, 0); cells.push([x, y]); break; }
        }
      }
    for (i = 0; i < cells.length; i++) {
      var X = cells[i][0], Y = cells[i][1], c;
      if (!L.has(X, Y - 2)) c = 0xf4eeff; else if (Y < cy + h * 0.05) c = 0xcbbcf2; else c = 0x9a86d6;
      if (!L.has(X, Y + 1)) c = 0x9a86d6;
      L.put(X, Y, c);
    }
    L.draw(g, 0x5a4598);
  }

  // ---------- halo + rays
  function halo(g, cx, cy, R) {
    var rings = [[0xffe27a, 0.42], [0xffb84a, 0.62], [0xff8a4a, 0.8], [0xd4566a, 1]];
    for (var y = Math.floor(cy - R); y <= cy + R; y++) for (var x = Math.floor(cx - R); x <= cx + R; x++) {
      var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R;
      if (d > 1) continue;
      for (var i = 0; i < rings.length; i++) if (d <= rings[i][1]) { g.set(x, y, rings[i][0]); break; }
    }
  }
  function rays(g, cx, cy, R0, R1, n, rot) {
    for (var y = Math.floor(cy - R1); y < cy + R1; y++) for (var x = Math.floor(cx - R1); x < cx + R1; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      if (d < R0 || d > R1) continue;
      var th = ((Math.atan2(dy, dx) / (Math.PI * 2) * n + (rot || 0)) % 1 + 1) % 1;
      var w = 0.22 * (1 - (d - R0) / (R1 - R0)) + 0.06;
      if (th < w) g.set(x, y, d < (R0 + R1) / 2 ? 0xffcf5a : 0xc8566e);
    }
  }

  // ---------- the temple (the logo)
  function temple(g, cx, top, s) {
    s = s || 1;
    var L = new Layer(), W = Math.floor(60 * s), x0 = cx - Math.floor(W / 2), ph = Math.floor(15 * s), x, y, yy;
    for (y = 0; y < ph; y++) {
      var hw = (y + 1) / ph * (W / 2 + 2 * s);
      for (x = Math.floor(cx - hw); x <= cx + hw; x++) {
        var edge = Math.abs(x - cx) > hw - 2 * s || y < 1, c;
        c = edge && x < cx ? C.g0 : edge ? C.g1 : C.g4;
        if (!edge && y > ph * 0.35 && Math.abs(x - cx) < hw - 3 * s) c = C.g5;
        L.put(x, top + y, c);
      }
    }
    y = top + ph;
    var eh = Math.floor(5 * s);
    for (yy = 0; yy < eh; yy++) for (x = x0 - Math.floor(2 * s); x <= x0 + W + Math.floor(2 * s); x++) {
      c = yy === 0 ? C.g1 : yy < 3 * s ? C.g2 : C.g4;
      if (yy === Math.floor(2.5 * s) && Math.floor(x / Math.max(1, Math.floor(3 * s))) % 2 === 0) c = C.g5;
      L.put(x, y + yy, c);
    }
    y += eh;
    var colh = Math.floor(26 * s), cw = Math.floor(8 * s);
    for (var i = 0; i < 4; i++) {
      var cx0 = x0 + Math.floor(i * (W - cw) / 3);
      for (yy = 0; yy < colh; yy++) for (x = cx0; x < cx0 + cw; x++) {
        var k = x - cx0;
        if (yy < 2 * s || yy >= colh - 2 * s) {
          c = yy < s || yy >= colh - s ? C.g1 : C.g2;
          L.put(x - Math.floor(s), y + yy, c); L.put(x + Math.floor(s), y + yy, c); continue;
        }
        c = k < cw * 0.2 ? C.g0 : k < cw * 0.55 ? C.g2 : k < cw * 0.85 ? C.g4 : C.g5;
        if (k === Math.floor(cw * 0.35)) c = C.g4; if (k === Math.floor(cw * 0.7)) c = C.g6;
        L.put(x, y + yy, c);
      }
    }
    y += colh;
    for (i = 0; i < 3; i++) {
      var ext = Math.floor((2 + i * 3) * s);
      for (yy = 0; yy < Math.floor(3 * s); yy++) for (x = x0 - ext; x <= x0 + W + ext; x++) L.put(x, y + yy, yy === 0 ? C.g1 : x < cx + W * 0.3 ? C.g2 : C.g4);
      y += Math.floor(3 * s);
    }
    L.draw(g, C.ol, 0x120a1e, 2, 2);
    return y;
  }
  var BOLT = [[60, 0], [22, 54], [45, 54], [32, 100], [80, 38], [56, 38], [70, 0]];
  function bolt(g, cx, cy, size, flash) {
    var L = new Layer(), cells = [], x, y;
    for (y = Math.floor(cy - size / 2) - 2; y < cy + size / 2 + 3; y++) for (x = Math.floor(cx - size / 2) - 2; x < cx + size / 2 + 3; x++) {
      var u = (x + 0.5 - cx) / size * 100 + 50, v = (y + 0.5 - cy) / size * 100 + 50;
      if (inPoly(u, v, BOLT)) {
        var c = 0xffffff;
        if (!inPoly(u + 7, v + 7, BOLT)) c = C.g2; else if (inPoly(u - 9, v - 9, BOLT) && inPoly(u + 9, v + 9, BOLT)) c = C.g0;
        L.put(x, y, c); cells.push([x, y]);
      }
    }
    var glow = flash ? 0xffffff : C.g1;
    for (var i = 0; i < cells.length; i++) for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) {
      if (dx * dx + dy * dy <= 5 && !L.has(cells[i][0] + dx, cells[i][1] + dy)) g.set(cells[i][0] + dx, cells[i][1] + dy, glow);
    }
    L.draw(g, 0x7a3a06);
  }

  // ---------- gold
  function sprite(g, x0, y0, rows, pal) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) { var ch = rows[j][i]; if (pal[ch] != null) g.set(x0 + i, y0 + j, pal[ch]); }
  }
  var COINPAL = { O: C.g7, L: C.g0, m: C.g2, d: C.g4, D: C.g5 };
  function coin(g, x, y, small) {
    sprite(g, x, y, small ? [" OOO ", "OLmmO", "OmmdO", " OOO "] : [" OOOOO ", "OLLmmmO", "OLmmmdO", "OmmmddO", " OdddO "], COINPAL);
  }
  function stack(g, x, base, n) { for (var i = 0; i < n; i++) sprite(g, x, base - i * 2 - 3, [" OOOOO ", "OLmmmdO", "OddddDO", " OOOOO "], COINPAL); }
  function goldFloor(g, y0, seed) {
    var r = rng(seed), x, y;
    for (y = y0; y < g.h; y++) for (x = 0; x < g.w; x++) {
      var c = C.g2;
      if (y === y0) c = 0xfff1a8; else if (y === y0 + 1) c = C.g1;
      else if ((y - y0) % 4 === 2 && (x + y * 3) % 9 < 3) c = 0xfff1a8;
      else if (x > g.w * 0.55 && (x + y) % 2 === 0 && y > y0 + 4) c = C.g3;
      g.set(x, y, c);
    }
    x = Math.floor(r() * 6);
    while (x < g.w) { coin(g, x, y0 - 3 + Math.floor(r() * 2), r() > 0.6); x += 9 + Math.floor(r() * 8); }
  }

  // ---------- pixel type
  var FONT = {
    M: ["XX.....XX", "XXX...XXX", "XXXX.XXXX", "XX.XXX.XX", "XX..X..XX", "XX.....XX", "XX.....XX", "XX.....XX", "XX.....XX"],
    Y: ["XX.....XX", "XX.....XX", ".XX...XX.", "..XX.XX..", "...XXX...", "...XXX...", "...XXX...", "...XXX...", "...XXX..."],
    T: ["XXXXXXXXX", "XXXXXXXXX", "...XXX...", "...XXX...", "...XXX...", "...XXX...", "...XXX...", "...XXX...", "...XXX..."],
    H: ["XX.....XX", "XX.....XX", "XX.....XX", "XX.....XX", "XXXXXXXXX", "XXXXXXXXX", "XX.....XX", "XX.....XX", "XX.....XX"]
  };
  function wordmark(g, x0, y0, text, cell, gap) {
    var L = new Layer(), x = x0, ext = new Layer();
    for (var n = 0; n < text.length; n++) {
      var gl = FONT[text[n]], H = gl.length * cell;
      for (var j = 0; j < gl.length; j++) for (var i = 0; i < gl[j].length; i++) if (gl[j][i] === "X")
        for (var yy = 0; yy < cell; yy++) for (var xx = 0; xx < cell; xx++) {
          var py = j * cell + yy, t = py / H, c;
          c = t < 0.12 ? C.g0 : t < 0.4 ? C.g1 : t < 0.62 ? C.g2 : t < 0.82 ? C.g3 : 0xd08a1c;
          if (t > 0.45 && t < 0.5) c = 0xfff1a8;
          L.put(x + i * cell + xx, y0 + py, c);
        }
      x += gl[0].length * cell + gap;
    }
    var depth = Math.max(3, cell);
    L.m.forEach(function (c, k) { var X = k % 65536, Y = Math.floor(k / 65536); for (var d = 1; d <= depth; d++) ext.put(X + d, Y + d, d > 1 ? C.g6 : 0x8a5414); });
    L.m.forEach(function (c, k) { ext.m.set(k, c); });
    ext.draw(g, C.ol);
    return x - gap;
  }
  var CAPS = {
    P: ["XX.", "X.X", "XX.", "X..", "X.."], I: ["XXX", ".X.", ".X.", ".X.", "XXX"], C: [".XX", "X..", "X..", "X..", ".XX"],
    K: ["X.X", "X.X", "XX.", "X.X", "X.X"], A: [".X.", "X.X", "XXX", "X.X", "X.X"], G: [".XX", "X..", "X.X", "X.X", ".XX"],
    O: [".X.", "X.X", "X.X", "X.X", ".X."], D: ["XX.", "X.X", "X.X", "X.X", "XX."], ".": [".", ".", ".", ".", "X"],
    T: ["XXX", ".X.", ".X.", ".X.", ".X."], R: ["XX.", "X.X", "XX.", "X.X", "X.X"], U: ["X.X", "X.X", "X.X", "X.X", "XXX"],
    N: ["XX.", "X.X", "X.X", "X.X", "X.X"], S: [".XX", "X..", ".X.", "..X", "XX."], Y: ["X.X", "X.X", ".X.", ".X.", ".X."],
    E: ["XXX", "X..", "XX.", "X..", "XXX"], F: ["XXX", "X..", "XX.", "X..", "X.."], H: ["X.X", "X.X", "XXX", "X.X", "X.X"],
    " ": ["..", "..", "..", "..", ".."]
  };
  function caps(g, x0, y0, text, cell, col, shadow) {
    [[1, shadow], [0, col]].forEach(function (pass) {
      var x = x0;
      for (var n = 0; n < text.length; n++) {
        var gl = CAPS[text[n]];
        for (var j = 0; j < gl.length; j++) for (var i = 0; i < gl[j].length; i++) if (gl[j][i] === "X")
          for (var yy = 0; yy < cell; yy++) for (var xx = 0; xx < cell; xx++) g.set(x + i * cell + xx + pass[0], y0 + j * cell + yy + pass[0], pass[1]);
        x += (gl[0].length + 1) * cell;
      }
    });
  }
  function capsWidth(text, cell) { var w = 0; for (var n = 0; n < text.length; n++) w += (CAPS[text[n]][0].length + 1) * cell; return w - cell; }

  // ---------- god icons (24 x 24 units, drawn at any integer scale)
  var ICON = {
    zeus: [[[13, 1], [5, 13], [10, 13], [7, 23], [19, 9], [13, 9], [17, 1]]],
    poseidon: [[[11, 1], [13, 1], [13, 23], [11, 23]], [[9, 4], [12, -1], [15, 4]],
               [[4, 3], [6, 3], [6, 10], [18, 10], [18, 3], [20, 3], [20, 12], [4, 12]], [[3, 5], [5, 0], [7, 5]], [[17, 5], [19, 0], [21, 5]]],
    hades: [[[12, 1], [14, 6], [18, 9], [19, 15], [17, 20], [12, 23], [7, 20], [5, 15], [6, 10], [9, 13], [9, 7]]],
    hermes: [[[11, 8], [13, 8], [13, 23], [11, 23]], [[12, 4], [14.5, 6.5], [12, 9], [9.5, 6.5]],
             [[10, 9], [1, 3], [3, 7], [1, 8], [4, 11], [3, 13], [10, 13]], [[14, 9], [23, 3], [21, 7], [23, 8], [20, 11], [21, 13], [14, 13]]]
  };
  function godIcon(g, name, x0, y0, sc) {
    var L = new Layer(), col = GODS[name], polys = ICON[name], inner = name === "hades" ? [[12, 9], [15, 14], [14, 19], [12, 21], [10, 19], [9, 15]] : null;
    for (var y = 0; y < 24 * sc; y++) for (var x = 0; x < 24 * sc; x++) {
      var u = (x + 0.5) / sc, v = (y + 0.5) / sc, hit = false;
      for (var p = 0; p < polys.length; p++) if (inPoly(u, v, polys[p])) { hit = true; break; }
      if (!hit) continue;
      var c = C.g2;
      var lit = false, dk = false;
      for (p = 0; p < polys.length; p++) { if (inPoly(u - 1.2, v - 1.2, polys[p])) lit = true; if (inPoly(u + 1.2, v + 1.2, polys[p])) dk = true; }
      if (!lit) c = C.g0; else if (!dk) c = C.g5;
      if (inner && inPoly(u, v, inner)) c = name === "hades" ? 0xff8a3a : c;
      L.put(x0 + x, y0 + y, c);
    }
    L.draw(g, C.ol, col.d, sc, sc);
  }

  // ---------- compositions
  // wide hero (375 x 125): wordmark left, temple on olympus right. narrow hero (200 x 150): stacked.
  function scene(g, o) {
    o = o || {};
    var t = o.t || 0, wide = g.w >= 300, W = g.w, H = g.h;
    sky(g, H - 8);
    stars(g, wide ? 70 : 45, wide ? 60 : 70, 4, o.still ? null : t);
    var LX = wide ? 268 : Math.floor(W / 2), LY = wide ? 44 : 78, top = wide ? 18 : 52;
    var BP = wide ? [[268, 52, 66], [190, 30, 40], [352, 36, 44], [120, 20, 40], [30, 14, 40]] : [[100, 44, 60], [24, 22, 40], [180, 24, 40]];
    var FP = wide ? [[232, 20, 38], [318, 24, 42], [160, 12, 34], [60, 10, 40]] : [[60, 16, 40], [150, 18, 44]];
    var base = wide ? 104 : 136;
    mountains(g, BP, base, 0x3a2a66, 0x2a1d4f, [0xe8e0ff, 0xb3a6e0], base - 24);
    halo(g, LX, LY, 40);
    rays(g, LX, LY, 40, 60, 18, o.still ? 0 : t * 0.02);
    mountains(g, BP, base, 0x3a2a66, 0x2a1d4f, [0xe8e0ff, 0xb3a6e0], base - 24);
    mountains(g, FP, base + 8, 0x24183f, 0x1a1130);
    if (wide) { cloud(g, 200, 86, 60, 8, 1); cloud(g, 336, 82, 56, 8, 2); cloud(g, 268, 80, 74, 8, 3); }
    else { cloud(g, 40, 116, 56, 7, 1); cloud(g, 166, 114, 52, 7, 2); cloud(g, 100, 114, 74, 7, 3); }
    temple(g, LX, top, 1);
    var flash = !o.still && (t % 7) < 0.12;
    bolt(g, LX + 1, top + 24, 30, flash);
    goldFloor(g, H - 11, 5);
    var st = wide ? [[330, 118, 6], [338, 120, 4], [222, 119, 4], [290, 121, 3], [366, 119, 5], [180, 121, 2]] : [[150, H - 7, 4], [160, H - 5, 2], [30, H - 6, 3], [182, H - 6, 5]];
    for (var i = 0; i < st.length; i++) stack(g, st[i][0], st[i][1], st[i][2]);
    var tw = wide ? [[160, 22], [214, 14], [330, 12], [362, 40], [130, 50], [16, 10]] : [[14, 12], [186, 16], [20, 70], [182, 64]];
    for (i = 0; i < tw.length; i++) twinkle(g, tw[i][0], tw[i][1], i % 2 === 0, o.still || Math.sin(t * 2 + i * 1.9) > -0.3);
    if (wide) wordmark(g, 16, 24, "MYTH", 4, 5);
    else wordmark(g, Math.floor((W - 123) / 2), 8, "MYTH", 3, 4);
    return g;
  }
  function ogGrid() {
    var g = new Grid(240, 126);
    sky(g, 118); stars(g, 50, 70, 9, null);
    var BP = [[196, 40, 52], [120, 22, 34], [236, 24, 30], [40, 12, 40]];
    mountains(g, BP, 106, 0x3a2a66, 0x2a1d4f, [0xe8e0ff, 0xb3a6e0], 84);
    halo(g, 196, 46, 34); rays(g, 196, 46, 34, 52, 16, 0);
    mountains(g, BP, 106, 0x3a2a66, 0x2a1d4f, [0xe8e0ff, 0xb3a6e0], 84);
    mountains(g, [[150, 14, 30], [226, 16, 30]], 112, 0x24183f, 0x1a1130);
    cloud(g, 150, 92, 44, 6, 5); cloud(g, 228, 90, 30, 6, 6); cloud(g, 196, 82, 60, 7, 7);
    temple(g, 196, 22, 1); bolt(g, 197, 46, 28, false);
    goldFloor(g, 115, 3);
    stack(g, 140, 121, 3); stack(g, 226, 122, 4); stack(g, 236, 121, 2);
    [[12, 10], [146, 14], [232, 12], [120, 50]].forEach(function (p, i) { twinkle(g, p[0], p[1], i % 2 === 0, true); });
    wordmark(g, 12, 18, "MYTH", 3, 4);
    caps(g, 13, 60, "PICK A GOD.", 2, C.cream, C.shade);
    caps(g, 13, 74, "IT RUNS THE FEES.", 2, C.g2, C.shade);
    return g;
  }
  function iconGrid() {
    var g = new Grid(32, 32);
    var L = new Layer(), rows = [
      "...............XX...............",
      ".............XXXXXX.............",
      "...........XXXXXXXXXX...........",
      ".........XXXXXXXXXXXXXX.........",
      ".......XXXXXXXXXXXXXXXXXX.......",
      ".....XXXXXXXXXXXXXXXXXXXXXX.....",
      "...XXXXXXXXXXXXXXXXXXXXXXXXXX...",
      "..XXXXXXXXXXXXXXXXXXXXXXXXXXXX..",
      "..XXXXXXXXXXXXXXXXXXXXXXXXXXXX.."
    ];
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < 32; i++) if (rows[j][i] === "X") L.put(i, j + 2, j === 0 || i < 16 && (rows[j][i - 1] !== "X") ? C.g0 : j > 6 ? C.g2 : C.g4);
    var cols = [4, 11, 18, 25];
    for (j = 11; j < 24; j++) for (i = 0; i < 4; i++) for (var k = 0; k < 4; k++) L.put(cols[i] + k - 1 + 1, j, k === 0 ? C.g0 : k === 3 ? C.g5 : C.g2);
    for (j = 24; j < 29; j++) for (i = 1 + Math.max(0, 26 - j) * 0; i < 31; i++) L.put(i, j, j === 24 || j === 27 ? C.g1 : C.g2);
    L.draw(g, C.ol);
    return g;
  }

  var API = { Grid: Grid, C: C, GODS: GODS, rng: rng, sky: sky, stars: stars, twinkle: twinkle, mountains: mountains, cloud: cloud, halo: halo, rays: rays,
    temple: temple, bolt: bolt, coin: coin, stack: stack, goldFloor: goldFloor, wordmark: wordmark, caps: caps, capsWidth: capsWidth,
    godIcon: godIcon, scene: scene, ogGrid: ogGrid, iconGrid: iconGrid };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.MYTH = API;
})(this);
