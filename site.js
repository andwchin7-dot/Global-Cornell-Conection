/* GCC Cornell — site.js
   1) photo carousel: arrow buttons, keyboard, mouse drag (touch uses native scroll-snap)
   2) slow node drift (≥20s loops), disabled under prefers-reduced-motion
   3) Home ambient band: scroll-driven fade-in of the nodes loop behind the carousel (static under prefers-reduced-motion)
   Nothing else. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- loading screen (Home): the counter eases toward 90 while the hero video buffers, snaps to 100
     on ready (video canplaythrough / window load, 900ms minimum, 6s hard cap — never trap a visitor), then the
     paper curtain lifts and the hero intro re-arms. html.is-loading is set inline in <head>. ---------- */
  (function () {
    var root = document.documentElement;
    var loader = document.querySelector("[data-loader]");
    if (!loader || !root.classList.contains("is-loading")) return;
    var nEl = loader.querySelector("[data-loader-n]");
    var barEl = loader.querySelector("[data-loader-bar]");
    var hv = document.querySelector(".hero--cinema video");
    var t0 = performance.now(), done = false, shown = 0;
    var finish = function () {
      if (done) return;
      done = true;
      shown = 100;
      if (nEl) nEl.textContent = "100";
      if (barEl) barEl.style.transform = "scaleX(1)";
      window.setTimeout(function () {
        root.classList.add("is-lifting");
        window.setTimeout(function () { root.classList.remove("is-loading", "is-lifting"); }, 850);
      }, 280);
    };
    var tick = function (now) {
      if (done) return;
      var t = (now - t0) / 1000;
      var target = Math.min(90, 90 * (1 - Math.pow(1 - Math.min(t / 3.2, 1), 2)));
      if (target > shown) {
        shown = target;
        if (nEl) nEl.textContent = String(Math.round(shown));
        if (barEl) barEl.style.transform = "scaleX(" + (shown / 100).toFixed(3) + ")";
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
    var armed = function () {
      window.setTimeout(finish, Math.max(0, 900 - (performance.now() - t0)));
    };
    if (hv && hv.readyState < 4) {
      hv.addEventListener("canplaythrough", armed, { once: true });
      window.addEventListener("load", function () { window.setTimeout(armed, 600); }, { once: true });
    } else if (document.readyState === "complete") {
      armed();
    } else {
      window.addEventListener("load", armed, { once: true });
    }
    window.setTimeout(finish, 6000);
  })();

  /* ---------- carousel ---------- */
  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector(".carousel");
    if (!track) return;
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    var behavior = reduce ? "auto" : "smooth";

    function step() {
      var card = track.querySelector(".card");
      if (!card) return track.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 16;
      return card.getBoundingClientRect().width + gap;
    }
    function go(dir) { track.scrollBy({ left: dir * step(), behavior: behavior }); }

    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });

    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });

    /* mouse drag (pointer events); touch/trackpad already scroll natively */
    var down = false, moved = false, startX = 0, startLeft = 0;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add("is-dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    function release() {
      if (!down) return;
      down = false;
      track.classList.remove("is-dragging");
      var s = step();
      var i = Math.round(track.scrollLeft / s);
      track.scrollTo({ left: i * s, behavior: behavior });
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    track.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* ---------- ambient loop: never autoplays for people who asked for less motion ---------- */
  if (reduce) {
    document.querySelectorAll(".card--video video, .ambient video, .hero--cinema video").forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
  }

  /* ---------- ambient band (Home): fades in behind the carousel as the headline scrolls away.
     Opacity = --ambient-rest × eased(scrollY / (bandTop − 120)): 0 at the top of the page, resting level by the time the
     headline has left the viewport. Scroll-driven, rAF-throttled, no scroll-jacking; the video pauses while off-screen.
     Reduced motion: CSS shows the static poster at rest and this block does nothing. ---------- */
  var band = document.querySelector("[data-ambient]");
  if (band && !reduce) {
    var rest = parseFloat(getComputedStyle(band).getPropertyValue("--ambient-rest")) || 0.32;
    var zone = band.parentElement;
    var ticking = false;
    var ramp = function () {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var top = zone.getBoundingClientRect().top + y;          /* page y where the band starts: just under the hero */
      var span = Math.max(160, top - 120);
      var t = Math.min(1, Math.max(0, y / span));
      band.style.opacity = (rest * (1 - (1 - t) * (1 - t))).toFixed(3);
    };
    var onScroll = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(ramp); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    ramp();

    var vid = band.querySelector("video");
    if (vid && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); }
          else vid.pause();
        });
      }, { rootMargin: "200px 0px" }).observe(band);
    }
  }


  /* ---------- Millennium register (Home): the hero text softens as the sheet slides over the pinned video;
     sections reveal as they enter; stat numerals count up once. All skipped under prefers-reduced-motion. ---------- */
  if (!reduce) {   /* v2.0: the reveal register runs site-wide (Millennium continuity), not just on Home */
    var heroText = document.querySelector(".hero--cinema .hero__text");
    var heroDim = document.querySelector(".hero--cinema .hero__dim");
    var heroVideo = document.querySelector(".hero--cinema .hero__video");
    if (heroText || heroDim || heroVideo) {
      var htTick = false;
      var htRamp = function () {
        htTick = false;
        var y = window.pageYOffset || 0, vh = window.innerHeight || 800;
        var f = Math.min(1, y / (vh * 0.55));
        var g = Math.min(1, y / vh);   /* redesign: the zoom runs the full first viewport, slower than the fade */
        if (heroText) {
          heroText.style.opacity = (1 - f).toFixed(3);
          heroText.style.transform = "translateY(" + (-f * 90).toFixed(1) + "px)";
        }
        /* continuity: the video recedes into the band's night as the sheet arrives — the hand-off is one world */
        if (heroDim) heroDim.style.opacity = (f * 0.6).toFixed(3);
        /* redesign: the aerial creeps in as the sheet rises over it (1 -> 1.1), so the pinned frame never reads as frozen */
        if (heroVideo) heroVideo.style.transform = "scale(" + (1 + g * 0.1).toFixed(4) + ")";
      };
      window.addEventListener("scroll", function () { if (!htTick) { htTick = true; requestAnimationFrame(htRamp); } }, { passive: true });
      htRamp();
    }
    var toReveal = document.querySelectorAll(".sheet > .section, .sheet > .gallery, .sheet > .divider, body:not(.home--cinema) main > .section");
    toReveal.forEach(function (el) { el.classList.add("js-reveal"); });
    var observed = Array.prototype.slice.call(toReveal);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -12% 0px" });
      observed.forEach(function (el) { io.observe(el); });
    } else {
      observed.forEach(function (el) { el.classList.add("is-in"); });
    }
    var counted = false;
    var stats = document.querySelectorAll(".stats .stat__n");
    if (stats.length && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || counted) return;
          counted = true; obs.disconnect();
          stats.forEach(function (el) {
            var m = el.textContent.match(/^(\d+)(.*)$/); if (!m) return;
            var target = +m[1], suffix = m[2], t0 = performance.now();
            var step = function (now) {
              var k = Math.min(1, (now - t0) / 900);
              el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
              if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          });
        });
      }, { rootMargin: "0px 0px -20% 0px" }).observe(stats[0]);
    }
  }

  /* ---------- tagline reveal: each word surfaces as it crosses a line ~35% up the viewport, in reading order
     (per-word IntersectionObserver + a small per-word delay). Skipped under reduced motion — text stays full strength. */
  var tagline = document.querySelector("[data-tagline] .tagline__text");
  if (tagline && !reduce && "IntersectionObserver" in window) {
    var wi = 0;
    tagline.innerHTML = tagline.innerHTML.split(/(<br\s*\/?>)/i).map(function (part) {
      if (/^<br/i.test(part)) return part;
      return part.split(/\s+/).filter(Boolean).map(function (w) {
        return '<span class="w" style="--i:' + (wi++) + '">' + w + "</span>";
      }).join(" ");
    }).join("");
    var wordIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); wordIO.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -35% 0px" });
    tagline.querySelectorAll(".w").forEach(function (w) { wordIO.observe(w); });
  }

  /* ---------- node drift ---------- */
  if (!reduce) {
    var nodes = document.querySelectorAll(".js-drift");
    for (var i = 0; i < nodes.length; i++) {
      var dur = 24 + ((i * 7) % 17);          /* 24–40s, never under 20s */
      var delay = -((i * 5) % 23);            /* stagger phases */
      nodes[i].style.setProperty("--drift-d", dur + "s");
      nodes[i].style.setProperty("--drift-delay", delay + "s");
      nodes[i].classList.add("is-drifting");
    }
  }
})();

/* ---------- the wall (v3.6): desk filters — tap a practice and its firms stay lit ---------- */
(function () {
  "use strict";
  document.querySelectorAll("[data-wall]").forEach(function (wall) {
    var btns = Array.prototype.slice.call(wall.querySelectorAll(".wallf"));
    var items = Array.prototype.slice.call(wall.querySelectorAll(".wall__item"));
    if (!btns.length) return;
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var desk = btn.getAttribute("data-desk");
        btns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        items.forEach(function (it) {
          var mine = (it.getAttribute("data-desk") || "").split(" ");
          it.classList.toggle("is-dim", desk !== "all" && mine.indexOf(desk) === -1);
        });
      });
    });
  });
})();

/* ---------- redesign/akpsi: the header gains a paper ground once the page has moved (no layout shift: Home nav is fixed,
   other pages sticky) ---------- */
(function () {
  "use strict";
  var nav = document.querySelector(".nav");
  if (!nav) return;
  var on = false, tick = false;
  var upd = function () {
    tick = false;
    var s = (window.pageYOffset || 0) > 24;
    if (s !== on) { on = s; nav.classList.toggle("is-scrolled", s); }
  };
  window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
})();

/* ---------- redesign/akpsi: staggered children — any [data-stagger] container hands each child its index;
   styles.css turns that into a 50ms cascade once the section reveals ---------- */
(function () {
  "use strict";
  document.querySelectorAll("[data-stagger]").forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty("--i", i); });
  });
})();

/* ---------- redesign/akpsi: the field (Placements) — every firm on one slow disc, grouped by desk.
   Four concentric ovals. Each desk owns a wedge (sized by how much ring its marks need; a wedge that cannot hold its
   marks is widened before anything else gives); within a wedge, narrow marks sit inside and wide ones outside, packed by
   arc length, then nudged apart wherever neighbouring rings run close. A small label rides just outside each wedge and
   steps outward or hides for a moment rather than touch a mark. The disc only appears when it can hold every mark
   cleanly: it measures them, shrinks them a little if that closes the gap, and otherwise hands over to the dense wrap.
   The disc turns as one body; each mark bobs on its own phase; the near edge reads larger and darker; the whole disc
   leans with the pointer; a spotlight lights what the pointer is near (on touch it wanders).
   Reduced motion: a still disc, all lit. Without JS the marks simply wrap. ---------- */
(function () {
  "use strict";
  var host = document.querySelector("[data-field]"); if (!host) return;
  var stage = host.querySelector(".field");
  var tiles = Array.prototype.slice.call(stage.querySelectorAll(".tile"));
  if (!tiles.length) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var DESKS = [["ib", "Investment banking"], ["pe", "Private equity & credit"], ["quant", "Quant & trading"], ["consult", "Consulting"],
               ["tech", "Technology"], ["amf", "Asset management & finance"], ["re", "Real estate"], ["grad", "Graduate study"]];
  var TAU = Math.PI * 2, n = tiles.length, W = 1, H = 1, live = false, rings = [], marks = [], labels = [], t0 = performance.now();
  var rnd = function (i, k) { var x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  tiles.forEach(function (t, i) {
    t._phase = rnd(i, 1) * TAU; t._speed = 0.3 + rnd(i, 2) * 0.3; t._amp = 3 + rnd(i, 3) * 4;
    t._bob = t.querySelector(".tile__bob") || t; t._lit = -1; t._x = 0; t._y = 0;
    t._desk = (t.getAttribute("data-desk") || "").split(" ")[0];
    t.style.setProperty("--i", i);
  });
  DESKS.forEach(function (d) {
    var el = document.createElement("span"); el.className = "field__wedge"; el.textContent = d[1]; el.setAttribute("aria-hidden", "true");
    stage.appendChild(el); labels.push({ code: d[0], el: el, a: 0, on: false, w: 0, h: 0 });
  });
  var arcAt = function (r, a) { a = ((a % TAU) + TAU) % TAU; var f = a / TAU * r.N, k = Math.floor(f); return k >= r.N ? r.P : r.table[k] + (r.table[k + 1] - r.table[k]) * (f - k); };
  var angleAt = function (r, L) { L = ((L % r.P) + r.P) % r.P; var lo = 0, hi = r.N; while (lo < hi) { var mid = (lo + hi) >> 1; if (r.table[mid] < L) lo = mid + 1; else hi = mid; } return lo / r.N * TAU; };
  var measure = function () {
    tiles.forEach(function (t) { t._w = t._bob.offsetWidth || 100; t._h = t._bob.offsetHeight || 24; });
    labels.forEach(function (l) { l.w = l.el.offsetWidth || 120; l.h = l.el.offsetHeight || 12; });
  };
  var buildRings = function (half, ratio) {
    return [0.28, 0.50, 0.72, 0.94].map(function (f) {
      var rx = f * half, ry = rx * ratio, table = [0], N = 720, acc = 0, px = rx, py = 0;
      for (var s = 1; s <= N; s++) { var a = s / N * TAU, x = rx * Math.cos(a), y = ry * Math.sin(a); acc += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py)); table.push(acc); px = x; py = y; }
      return { rx: rx, ry: ry, table: table, N: N, P: acc };
    });
  };
  var flow = function () {
    live = false; stage.classList.remove("is-live"); stage.style.height = ""; stage.style.setProperty("--ms", 1);
    var sr = stage.getBoundingClientRect(); H = Math.max(1, sr.height);
    tiles.forEach(function (t) { var r = t.getBoundingClientRect(); t._x = r.left - sr.left + r.width / 2; t._y = r.top - sr.top + r.height / 2; });
  };
  /* pack every desk into its wedge; returns the largest overflow fraction (0 = everything fitted) */
  var pack = function (gap, weights) {
    var byDesk = {}; DESKS.forEach(function (d) { byDesk[d[0]] = []; });
    tiles.forEach(function (t) { (byDesk[t._desk] || byDesk.grad).push(t); });
    var total = 0, needs = {};
    DESKS.forEach(function (d) { needs[d[0]] = byDesk[d[0]].reduce(function (s, t) { return s + t._w + gap; }, 0) * (weights[d[0]] || 1); total += needs[d[0]]; });
    marks = []; var cursor = -Math.PI / 2, worst = 0, over = {};
    DESKS.forEach(function (d) {
      var code = d[0], list = byDesk[code].slice().sort(function (a, b) { return a._w - b._w; });
      var span = TAU * needs[code] / total, a0 = cursor, a1 = cursor + span; cursor = a1;
      var lab = labels.filter(function (l) { return l.code === code; })[0]; lab.a = (a0 + a1) / 2; lab.on = list.length > 0;
      /* this wedge's segment on each ring */
      var segs = rings.map(function (r) { var La = arcAt(r, a0), seg = (arcAt(r, a1) - La + r.P) % r.P; if (seg < 1) seg = r.P * span / TAU; return { r: r, La: La, seg: seg, used: 0, batch: [] }; });
      var idx = 0;
      for (var k = 0; k < segs.length && idx < list.length; k++) {   /* narrow marks inside, wide outside */
        var sg = segs[k], last = k === segs.length - 1;
        while (idx < list.length && (sg.used + list[idx]._w + gap <= sg.seg || last)) { sg.batch.push(list[idx]); sg.used += list[idx]._w + gap; idx++; }
      }
      /* an overfull ring hands its smallest marks to any ring with room (inner rings usually have some) */
      for (var guard = 0; guard < 60; guard++) {
        var full = segs.filter(function (s) { return s.used > s.seg && s.batch.length > 1; })[0]; if (!full) break;
        var mv = full.batch[0], home = segs.filter(function (s) { return s !== full && s.used + mv._w + gap <= s.seg; })[0];
        if (!home) break;
        full.batch.shift(); full.used -= mv._w + gap; home.batch.push(mv); home.used += mv._w + gap;
      }
      segs.forEach(function (sg) {
        if (!sg.batch.length) return;
        if (sg.used > sg.seg) { var f = sg.used / sg.seg - 1; over[code] = Math.max(over[code] || 0, f); worst = Math.max(worst, f); }
        var slack = Math.max(0, sg.seg - sg.used) / sg.batch.length, L = sg.La + slack / 2;
        sg.batch.forEach(function (t) { L += (t._w + gap) / 2; marks.push({ t: t, r: sg.r, a0: angleAt(sg.r, L), w: t._w, h: t._h }); L += (t._w + gap) / 2 + slack; });
      });
    });
    return { worst: worst, over: over };
  };
  /* marks can still meet — within a ring that overflowed a little, or across rings where they run close: nudge such
     pairs apart along their rings. Returns true once nothing touches. */
  var settle = function (gap) {
    var S = 16, CLR = 10;   /* px of clear space every pair keeps, at every rotation */   /* the boxes do not turn with the disc, so a pair clear at rest can still meet at the sides: check the whole turn */
    for (var it = 0; it < 120; it++) {
      var moved = false;
      for (var s = 0; s < S; s++) {
        var rot = s / S * TAU;
        for (var a = 0; a < marks.length; a++) for (var b = a + 1; b < marks.length; b++) {
          var A = marks[a], B = marks[b], aa = A.a0 + rot, ab = B.a0 + rot;
          /* clearance is the straight-line gap between the two boxes (so a diagonal neighbour is not a false hit) */
          var gx = Math.abs(A.r.rx * Math.cos(aa) - B.r.rx * Math.cos(ab)) - (A.w + B.w) / 2; if (gx >= CLR) continue;
          var gy = Math.abs(A.r.ry * Math.sin(aa) - B.r.ry * Math.sin(ab)) - (A.h + B.h) / 2; if (gy >= CLR) continue;
          var g = Math.sqrt(Math.max(0, gx) * Math.max(0, gx) + Math.max(0, gy) * Math.max(0, gy)); if (g >= CLR) continue;
          moved = true; var step = Math.max(1, (CLR - g) / 2);
          [A, B].forEach(function (M, side) { var m = M.a0 + rot, tx = -M.r.rx * Math.sin(m), ty = M.r.ry * Math.cos(m), tl = Math.sqrt(tx * tx + ty * ty) || 1; M.a0 += (side === 0 ? -1 : 1) * step / tl; });
        }
      }
      if (!moved) return true;
    }
    return false;
  };
  var layout = function () {
    W = Math.max(1, stage.clientWidth);
    if (W < 900) return flow();
    var gap = 24, half = W / 2 - 24;
    var ratio = W >= 1300 ? 0.52 : 0.52 + (1300 - W) / 400 * 0.22;   /* rounder when narrower */
    var ryMax = Math.max(280, ((window.innerHeight || 900) - 240) / 2);
    ratio = Math.max(0.45, Math.min(ratio, 0.8, ryMax / (0.94 * half)));
    rings = buildRings(half, ratio);
    var avail = rings.reduce(function (s, r) { return s + r.P; }, 0);
    stage.classList.add("is-live"); stage.style.setProperty("--ms", 1); measure();
    /* at the sides neighbouring rings are 0.22 * half apart: the widest mark must fit in that with room, at any rotation */
    var maxW = tiles.reduce(function (m, t) { return Math.max(m, t._w); }, 0), maxH = tiles.reduce(function (m, t) { return Math.max(m, t._h); }, 0);
    var msCap = Math.min((0.22 * half - 14) / maxW, (0.22 * half * ratio - 12) / maxH);
    if (msCap < 0.7) return flow();
    var ms = Math.min(1, msCap), weights = {}, ok = false;
    if (ms < 1) { stage.style.setProperty("--ms", ms.toFixed(3)); measure(); }
    for (var pass = 0; pass < 40 && !ok; pass++) {
      var need = tiles.reduce(function (s, t) { return s + t._w + gap; }, 0);
      if (need * 1.1 > avail) {   /* not enough ring at this size: shrink the marks a little */
        ms = ms * Math.min(0.97, avail / (need * 1.1));
        if (ms < 0.7) return flow();
        stage.style.setProperty("--ms", ms.toFixed(3)); measure(); continue;
      }
      var res = pack(gap, weights);
      if (res.worst <= 0.35 && settle(gap)) { ok = true; break; }   /* settle is the real test: converged means nothing touches */
      /* a wedge that overflowed takes a little more of the disc (damped, so the sizes converge rather than bounce);
         every tenth pass without a fit, the marks shrink a step and the search continues with what it has learned */
      var bumped = false;
      for (var code in res.over) { if (res.over.hasOwnProperty(code) && res.over[code] > 0.02) { weights[code] = (weights[code] || 1) * (1 + 0.5 * res.over[code]); bumped = true; } }
      if (!bumped || (pass + 1) % 10 === 0) { ms = ms * 0.94; if (ms < 0.7) return flow(); stage.style.setProperty("--ms", ms.toFixed(3)); measure(); }
    }
    if (!ok) return flow();
    live = true;
    H = Math.round(rings[3].ry * 2 + 2 * 58 + 56);
    stage.style.height = H + "px";
  };
  var px = -1e4, py = -1e4, tx = 0, ty = 0, mx = 0, my = 0, wv = -TAU / 150;   /* one turn every 150s */
  var setPointer = function (cx, cy) { var r = stage.getBoundingClientRect(); px = cx - r.left; py = cy - r.top; tx = px / W - 0.5; ty = py / H - 0.5; };
  var hits = function (x, y, w, h) {   /* does a box at (x,y) touch any mark, at its current position? */
    for (var i = 0; i < marks.length; i++) { var m = marks[i]; if (Math.abs(m.t._x - x) < (m.w + w) / 2 + 10 && Math.abs(m.t._y - y) < (m.h + h) / 2 + 8) return true; }
    return false;
  };
  var frame = function (now) {
    var s = (now - t0) / 1000;
    if (!fine && !reduce) { px = W * (0.5 + 0.42 * Math.sin(s * 0.23)); py = H * (0.5 + 0.40 * Math.sin(s * 0.31 + 1.3)); tx = px / W - 0.5; ty = py / H - 0.5; }
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    var cx = W / 2 - mx * 26, cy = H / 2 - my * 18, rot = reduce ? 0 : wv * s;
    if (live) {
      marks.forEach(function (mk) {
        var t = mk.t, r = mk.r, a = mk.a0 + rot, sn = Math.sin(a), near = (sn + 1) / 2, ry = r.ry * (1 - my * 0.12);
        var bx = reduce ? 0 : Math.sin(s * t._speed + t._phase) * t._amp * 0.4, by = reduce ? 0 : Math.cos(s * t._speed * 0.8 + t._phase) * t._amp;
        t._x = cx + r.rx * Math.cos(a) + bx; t._y = cy + ry * sn + by;
        t._bob.style.transform = "translate(" + t._x.toFixed(1) + "px," + t._y.toFixed(1) + "px) translate(-50%,-50%) scale(" + (0.9 + 0.1 * near).toFixed(3) + ")";
        t.style.setProperty("--far", (1 - near).toFixed(3));
      });
      var out = rings[3];
      labels.forEach(function (l) {
        if (!l.on) { l.el.style.display = "none"; return; }
        var a = l.a + rot, shown = false, x = 0, y = 0;
        for (var step = 0; step < 8 && !shown; step++) {   /* just outside the rim; step outward if a mark is in the way */
          var g = 1 + step * 0.045;
          x = cx + (out.rx + 26) * g * Math.cos(a); y = cy + (out.ry + 46) * g * Math.sin(a);
          x = Math.min(W - l.w / 2 - 6, Math.max(l.w / 2 + 6, x)); y = Math.min(H - l.h / 2 - 4, Math.max(l.h / 2 + 4, y));
          if (!hits(x, y, l.w, l.h)) shown = true;
        }
        l.el.style.display = ""; l.el.style.opacity = shown ? "1" : "0";
        l.el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-50%)";
      });
    } else if (!reduce) {
      for (var i = 0; i < n; i++) { var t = tiles[i]; t._bob.style.transform = "translate(" + (Math.sin(s * t._speed + t._phase) * t._amp * 0.4).toFixed(2) + "px," + (Math.cos(s * t._speed * 0.8 + t._phase) * t._amp).toFixed(2) + "px)"; }
    }
    if (!reduce) {
      var R = Math.max(200, W * 0.2);
      for (var j = 0; j < n; j++) {
        var u = tiles[j], dx = u._x - px, dy = u._y - py, d = Math.sqrt(dx * dx + dy * dy);
        var lit = d > R ? 0 : 1 - d / R; lit = lit * lit * (3 - 2 * lit);
        if (Math.abs(lit - u._lit) > 0.004) { u._lit = lit; u.style.setProperty("--lit", lit.toFixed(3)); }
      }
      requestAnimationFrame(frame);
    }
  };
  layout();
  var relayout = function () { layout(); if (reduce) requestAnimationFrame(frame); };
  window.addEventListener("resize", relayout);
  window.addEventListener("load", relayout);
  if (fine) {
    stage.addEventListener("pointermove", function (e) { setPointer(e.clientX, e.clientY); });
    stage.addEventListener("pointerleave", function () { px = -1e4; py = -1e4; tx = 0; ty = 0; });
  }
  if (reduce) tiles.forEach(function (t) { t.style.setProperty("--lit", 1); });
  requestAnimationFrame(frame);
})();
