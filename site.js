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

/* ---------- redesign/akpsi: the desk switcher on Placements — one desk at a time, tabs + arrows + keyboard.
   Without JS every desk simply stacks, as before. ---------- */
(function () {
  "use strict";
  var host = document.querySelector("[data-desks]");
  if (!host) return;
  var panels = Array.prototype.slice.call(host.querySelectorAll(".desk"));
  if (panels.length < 2) return;
  var el = function (tag, cls, attrs) {
    var e = document.createElement(tag); e.className = cls;
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]); }
    return e;
  };
  var bar = el("div", "deskbar", {});
  var prev = el("button", "deskbar__arrow", { type: "button", "aria-label": "Previous desk" }); prev.innerHTML = "&larr;";
  var next = el("button", "deskbar__arrow", { type: "button", "aria-label": "Next desk" }); next.innerHTML = "&rarr;";
  var tabs = el("div", "deskbar__tabs", { role: "tablist", "aria-label": "Desks" });
  var count = el("span", "deskbar__count", { "aria-hidden": "true" });
  var btns = panels.map(function (p, i) {
    var id = "desk-" + i; p.id = id; p.setAttribute("role", "tabpanel");
    var b = el("button", "deskbar__tab", { type: "button", role: "tab", "aria-controls": id });
    var lab = p.querySelector(".desk__label"); b.textContent = lab ? lab.textContent : ("Desk " + (i + 1));
    b.addEventListener("click", function () { show(i, true); });
    tabs.appendChild(b); return b;
  });
  bar.appendChild(prev); bar.appendChild(tabs); bar.appendChild(count); bar.appendChild(next);
  host.parentNode.insertBefore(bar, host);
  host.classList.add("is-switching");
  var cur = 0, n = panels.length;
  var pad = function (k) { return (k < 10 ? "0" : "") + k; };
  var show = function (i, focus) {
    cur = (i + n) % n;
    panels.forEach(function (p, k) { var on = k === cur; p.classList.toggle("is-active", on); p.hidden = !on; });
    btns.forEach(function (b, k) { var on = k === cur; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
    count.textContent = pad(cur + 1) + " / " + pad(n);
    if (focus) btns[cur].focus();
  };
  prev.addEventListener("click", function () { show(cur - 1); });
  next.addEventListener("click", function () { show(cur + 1); });
  tabs.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1, true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1, true); }
    else if (e.key === "Home") { e.preventDefault(); show(0, true); }
    else if (e.key === "End") { e.preventDefault(); show(n - 1, true); }
  });
  show(0);
})();
