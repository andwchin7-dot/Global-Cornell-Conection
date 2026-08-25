# Updating the GCC Cornell site

Everything is plain files — no accounts, no build tools to install. You need Python 3 (already on every Mac) and a text editor.

## Preview it locally
```
cd "/Users/andrewchinn/Claude Code/gcc-website"
python3 -m http.server 8123
```
Then open http://localhost:8123 — or just double-click `index.html`. After editing, hard-refresh (⌘⇧R).

## The one command
After changing anything in `content/`, run:
```
cd "/Users/andrewchinn/Claude Code/gcc-website"
python3 build.py
```
It rewrites the generated parts of the pages and prints a short report. Nothing else on the site is touched.

## Change the executive board → `content/board.json`
- Edit names, roles, years, majors, emails (set `"show_emails": false` to hide all emails). Phone numbers are never shown.
- Headshot: save a JPEG as `assets/people/first-last.jpg` (lowercase, hyphen, e.g. `assets/people/sophia-jian.jpg`) — it is picked up automatically. Square-ish head-and-shoulders photos, 400–800px, work best. No photo → a quiet empty tile.
- Run `python3 build.py`. The board grid on the Members page and "Who runs it" on About both update.
- To choose who appears in About's "Who runs it" and "What we stand for", edit `content/about.json` (names must match board.json).

## Change members / alumni → `content/members.json`, `content/alumni.json`
- Members are grouped by the semester they joined; add a person as `{"name": "…", "major": "Economics '29"}` (a photo at `assets/people/first-last.jpg` is optional).
- Alumni: `{"name": "…", "role": "Analyst at Firm"}`. The six in `"featured"` are the headshot row on the Members page — pick people with clean head-and-shoulders photos.
- Someone who graduates: move their entry from members.json to alumni.json.
- Run `python3 build.py`.

## Change photos → `content/gallery.json`
- Put the photo in `assets/img/` (phone photos are fine; 2000px wide is plenty).
- Home slideshow: add/replace an entry in `"carousel"` (first one is the opener). Captions should say what the photo shows ("Spring banquet, Statler Hall").
- The three "What we do" cards: `"pillars"`.
- `"position"` is which part of the photo stays in frame when cropped — `"50% 30%"` keeps the upper third (faces).
- Run `python3 build.py`.
- Other photos (About, Recruitment, Members event photos) are ordinary `<img>` tags in those HTML files — swap the `src` and caption directly.

## Change text
- Home / About / Recruitment text lives in `index.html`, `about.html`, `recruitment.html` — edit in place. Anything marked `data-placeholder="…"` is a placeholder the chapter still needs to confirm (captions, application prompts, dates, quote attribution).
- Nav and footer: edit `partials/nav.html` / `partials/footer.html`, then run `python3 build.py` (it copies them into every page).

## Design rules (so edits stay on-system)
`../gcc-design-loop/design-system.md` — palette (cream / ink / carnelian motif / navy CTA), type (Instrument Serif only for headlines, numerals, quotes; Instrument Sans elsewhere, no bold), hairline → title-left → link-right sections, one photo caption per card. Shared styles: `styles.css`. Scripts: `site.js` (carousel, node drift, live map).

## Publish
The folder is a static site: drag `gcc-website/` onto Netlify Drop, or push it to GitHub Pages / Vercel. Point gcccornell.com at the host when you're ready to replace the Wix site.

## The members-only alumni directory → `alumni.html`
- The full alumni list lives behind a shared password at `alumni.html`. The page is encrypted at build time —
  the published site contains no readable names without the password.
- The password is in `content/alumni-password.txt` (this file is gitignored and must never be committed).
  To change it: edit the file, run `python3 build.py`, push. Share the new password with members.
- Requires the `cryptography` package once per machine: `python3 -m pip install --user cryptography`.
