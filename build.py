#!/usr/bin/env python3
"""Rebuild the parts of the GCC Cornell site that come from content/*.json.

    cd gcc-website && python3 build.py

What it does (and nothing else):
  - members.html      ← templates/members.html + content/board.json, members.json, alumni.json, crops.json
  - index.html        ← content/gallery.json (the photo carousel and the three "What we do" cards),
                        written between <!-- build:gallery --> / <!-- build:pillars --> markers
  - about.html        ← content/about.json + board.json ("Who runs it" and "What we stand for"),
                        written between <!-- build:who-runs-it --> / <!-- build:values --> markers
  - every page        ← partials/nav.html, footer.html, nodes.html re-synced
Headshots: assets/people/<first-last>.jpg is used automatically when it exists (lowercase, hyphens, e.g.
assets/people/sophia-jian.jpg); a person without a photo gets a quiet empty tile, never an initials circle.
Plain Python 3, no packages. Prints a short report; exits non-zero if a marker or file is missing.
"""
import html, json, re, struct, sys
from pathlib import Path

SITE = Path(__file__).resolve().parent
CONTENT = SITE / "content"

def load(name):
    return json.loads((CONTENT / name).read_text(encoding="utf-8"))

board_data = load("board.json"); members_data = load("members.json"); alumni_data = load("alumni.json")
crops_data = load("crops.json"); gallery_data = load("gallery.json"); about_data = load("about.json")

def esc(s): return html.escape(str(s or ""))
def slug(name): return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def photo_for(person):
    p = person.get("photo")
    if p and (SITE / p).exists():
        return p
    auto = SITE / "assets/people" / (slug(person["name"]) + ".jpg")
    return f"assets/people/{auto.name}" if auto.exists() else None

# ---------- headshot crop (face placed at the same spot in every square box) ----------
DEFAULT_CROP = tuple(crops_data.get("default", [0.5, 0.36, 1.15]))
CROPS = {k: tuple(v) for k, v in crops_data.get("people", {}).items()}
TARGET = (0.50, 0.46)

def jpeg_size(path):
    data = Path(path).read_bytes(); w = h = None; orient = 1; i = 2
    while i + 4 <= len(data) and data[i] == 0xFF:
        marker = data[i + 1]; seglen = struct.unpack(">H", data[i + 2:i + 4])[0]; seg = data[i + 4:i + 2 + seglen]
        if marker == 0xE1 and seg[:6] == b"Exif\x00\x00":
            t = seg[6:]
            if len(t) >= 8:
                end = "<" if t[:2] == b"II" else ">"
                try:
                    off = struct.unpack(end + "I", t[4:8])[0]; n = struct.unpack(end + "H", t[off:off + 2])[0]
                    for k in range(n):
                        ent = t[off + 2 + 12 * k: off + 14 + 12 * k]; tag, typ, cnt = struct.unpack(end + "HHI", ent[:8])
                        if tag == 0x0112: orient = struct.unpack(end + "H", ent[8:10])[0]; break
                except struct.error: pass
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h, w = struct.unpack(">HH", seg[1:5]); break
        if marker == 0xDA: break
        i += 2 + seglen
    if w is None: return (480, 480)
    return (h, w) if orient in (5, 6, 7, 8) else (w, h)

def crop_style(name, rel):
    fx, fy, z = CROPS.get(name, DEFAULT_CROP)
    w, h = jpeg_size(SITE / rel); ar = h / w
    z = max(z, 1.0, 1.0 / ar); dw, dh = z, z * ar
    left = min(0.0, max(1.0 - dw, TARGET[0] - fx * dw)); top = min(0.0, max(1.0 - dh, TARGET[1] - fy * dh))
    return f"--w:{dw*100:.1f}%;--l:{left*100:.1f}%;--t:{top*100:.1f}%", w, h

def headshot(person, lazy=True):
    rel = photo_for(person)
    if not rel:
        return '<span class="hs hs--empty" aria-hidden="true"></span>'
    style, w, h = crop_style(person["name"], rel)
    extra = ' loading="lazy" decoding="async"' if lazy else ""
    return (f'<span class="hs"><img src="{esc(rel)}" alt="Portrait of {esc(person["name"])}" width="{w}" height="{h}" style="{style}"{extra}></span>')

def nowrap_year(s):
    return re.sub(r" ('\d\d)$", r"&nbsp;\1", esc(s))

# ---------- members.html ----------
board_people = [dict(p, group=g["name"]) for g in board_data["groups"] for p in g["people"]]
board_names = {p["name"] for p in board_people}
show_emails = bool(board_data.get("show_emails"))

def board_li(p):
    second = esc(p.get("role", ""))
    detail = " · ".join(x for x in [esc(p.get("major", "")), esc(p.get("year", ""))] if x)
    mail = f'<a class="person__mail" href="mailto:{esc(p["email"])}">{esc(p["email"])}</a>' if show_emails and p.get("email") else ""
    return ("<li>" + headshot(p) + f'<span class="person__name">{esc(p["name"])}</span>'
            + f'<span class="person__role">{second}</span>'
            + (f'<span class="person__detail">{detail}</span>' if detail else "") + mail + "</li>")

def roster_li(p):
    out = "<li>" + headshot(p) + '<span class="roster__text">' + f'<span class="roster__name">{esc(p["name"])}</span>'
    if p.get("major"): out += f'<span class="roster__role">{nowrap_year(p["major"])}</span>'
    return out + "</span></li>"

def dir_li(p):
    out = f'<li><span class="directory__name">{esc(p["name"])}</span>'
    if p.get("role"): out += f'<span class="directory__role">{nowrap_year(p["role"])}</span>'
    return out + "</li>"

# the roster keeps every member exactly as listed — board members appear in BOTH the board grid and their
# own semester class (overlap is intended; the board is drawn from these classes)
roster_groups = [(g["semester"], g["people"]) for g in members_data["groups"] if g["people"]]
omitted = 0
alumni = alumni_data["people"]; by_name = {p["name"]: p for p in alumni}
featured = [by_name[n] for n in alumni_data.get("featured", []) if n in by_name]

members_html = "\n".join(
    f'<div class="roster__group">\n<p class="label roster__label">{esc(s)}</p>\n<ul class="roster__grid" aria-label="{esc(s)} members">\n'
    + "\n".join(roster_li(p) for p in ps) + "\n</ul>\n</div>" for s, ps in roster_groups)

def partial(name):
    t = (SITE / "partials" / name).read_text(encoding="utf-8").strip()
    return re.sub(r"^(?:<!--.*?-->\s*)+", "", t, flags=re.S)   # leading doc comments never enter the pages

def nav_for(page):
    nav = partial("nav.html")
    return re.sub(r'(<a\b[^>]*href="%s"[^>]*)(>)' % re.escape(page),
                  lambda m: m.group(1) + (' aria-current="page"' if 'aria-current' not in m.group(1) else '') + m.group(2), nav)

tpl = (SITE / "templates/members.html").read_text(encoding="utf-8")
out = (tpl.replace("{{NODES}}", partial("nodes.html")).replace("{{NAV}}", nav_for("members.html")).replace("{{FOOTER}}", partial("footer.html"))
          .replace("{{FEATURED}}", "\n".join(board_li(p) if False else (
              "<li>" + headshot(p, lazy=False) + f'<span class="person__name">{esc(p["name"])}</span><span class="person__role">{nowrap_year(p.get("role",""))}</span></li>') for p in featured))
          .replace("{{BOARD}}", "\n".join(board_li(p) for p in board_people))
          .replace("{{BOARD_TERM}}", esc(board_data.get("term", "")))
          .replace("{{MEMBERS}}", members_html)
          .replace("{{DIRECTORY}}", "\n".join(dir_li(p) for p in alumni))
          .replace("{{ALUMNI_COUNT}}", str(len(alumni))).replace("{{OMITTED}}", str(omitted)))
(SITE / "members.html").write_text(out, encoding="utf-8")

# ---------- marker replacement helper ----------
def replace_block(path, marker, inner):
    t = path.read_text(encoding="utf-8")
    pat = re.compile(r"(<!-- build:%s -->)(.*?)(<!-- /build:%s -->)" % (re.escape(marker), re.escape(marker)), re.S)
    if not pat.search(t):
        sys.exit(f"build: marker <!-- build:{marker} --> not found in {path.name}")
    t = pat.sub(lambda m: m.group(1) + "\n" + inner.strip("\n") + "\n" + m.group(3), t, count=1)
    path.write_text(t, encoding="utf-8")

# ---------- index.html: carousel + pillars ----------
cards = "\n".join(
    f'        <figure class="card">\n          <img src="{esc(c["src"])}" alt="{esc(c["alt"])}" style="object-position:{esc(c.get("position","50% 50%"))}" draggable="false">\n'
    f'          <figcaption data-placeholder="caption">{esc(c["caption"])}</figcaption>\n        </figure>' for c in gallery_data["carousel"])
replace_block(SITE / "index.html", "gallery", cards)
pillars = "\n".join(
    f'      <article class="program">\n        <img src="{esc(p["src"])}" alt="{esc(p["alt"])}" style="object-position:{esc(p.get("position","50% 50%"))}">\n'
    f'        <div class="program__body">\n          <h3 class="program__title">{esc(p["title"])}</h3>\n          <p>{esc(p["text"])}</p>\n'
    f'          <a class="pill pill--light" href="{esc(p["href"])}">{esc(p["link_text"])}</a>\n        </div>\n      </article>' for p in gallery_data["pillars"])
replace_block(SITE / "index.html", "pillars", pillars)

# ---------- about.html: who runs it + values ----------
bp = {p["name"]: p for p in board_people}
def about_person(name):
    p = bp.get(name, {"name": name, "role": ""})
    rel = photo_for(p)
    if rel:
        fx, fy, z = CROPS.get(name, DEFAULT_CROP)
        img = f'<div class="person__photo"><img src="{esc(rel)}" alt="{esc(name)}" style="--oy:{int(fy*100)}%" loading="lazy" draggable="false"></div>'
    else:
        img = '<div class="person__photo person__photo--empty" aria-hidden="true"></div>'
    return (f'          <figure class="person">\n            {img}\n            <figcaption><span class="person__name">{esc(name)}</span>'
            f'<span class="person__role">{esc(p.get("role",""))}</span></figcaption>\n          </figure>')
who = "\n".join("      <li>\n" + about_person(n) + "\n      </li>" for n in about_data["who_runs_it"][:4])
replace_block(SITE / "about.html", "who-runs-it", who)
vals = []
for v in about_data["values"]:
    cls = "value value--pair" if len(v["people"]) > 1 else "value"
    vals.append(f'      <div class="{cls}">\n        <h3 class="value__name">{esc(v["name"])}</h3>\n        <div class="value__people">\n'
                + "\n".join(about_person(n) for n in v["people"]) + f'\n        </div>\n        <p class="value__fact">{esc(v["fact"])}</p>\n      </div>')
replace_block(SITE / "about.html", "values", "\n".join(vals))
_cols = sum(len(v["people"]) for v in about_data["values"])
_ap = SITE / "about.html"; _t = _ap.read_text(encoding="utf-8")
_t = re.sub(r'<div class="values"( style="--cols:\d+")?>', f'<div class="values" style="--cols:{_cols}">', _t, count=1)
_ap.write_text(_t, encoding="utf-8")

# ---------- re-sync nav/footer into the static pages ----------
for page in ["index.html", "about.html", "recruitment.html"]:
    path = SITE / page; t = path.read_text(encoding="utf-8")
    t = re.sub(r'<header\b[^>]*class="[^"]*\bnav\b[^"]*"[^>]*>.*?</header>', lambda m: nav_for(page), t, count=1, flags=re.S)
    t = re.sub(r'<footer\b.*?</footer>', lambda m: partial("footer.html"), t, count=1, flags=re.S)
    path.write_text(t, encoding="utf-8")

# ---------- cache-busting: stamp ?v=<styles mtime> on styles/site links in every page ----------
asset_version = int((SITE / "styles.css").stat().st_mtime)
for page in ["index.html", "about.html", "members.html", "recruitment.html"]:
    path = SITE / page; t2 = path.read_text(encoding="utf-8")
    t2 = re.sub(r'(href="styles\.css)(\?v=\d+)?(")', r"\1?v=%d\3" % asset_version, t2)
    t2 = re.sub(r'(src="(?:site|globe)\.js)(\?v=\d+)?(")', r"\1?v=%d\3" % asset_version, t2)
    path.write_text(t2, encoding="utf-8")

# ---------- report ----------
no_photo = [p["name"] for p in board_people if not photo_for(p)]
print(f"members.html: board {len(board_people)} ({board_data.get('term','')}), {len(no_photo)} without a headshot: {no_photo}")
print(f"             roster {sum(len(ps) for _, ps in roster_groups)} in {len(roster_groups)} semesters (board omitted: {omitted}); alumni {len(alumni)}, featured {len(featured)}")
print(f"index.html:  carousel {len(gallery_data['carousel'])} cards, pillars {len(gallery_data['pillars'])}")
print(f"about.html:  who runs it {len(about_data['who_runs_it'][:4])}, values {len(about_data['values'])}")
print("done — preview with: python3 -m http.server 8123  (then open http://localhost:8123)")
