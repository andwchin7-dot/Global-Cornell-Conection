# Updating the GCC Cornell site

Everything is plain files — no accounts, no build tools to install. You need Python 3 (already on every Mac) and a text editor.

## Preview it locally
```
cd path/to/Global-Cornell-Conection   # wherever you cloned it
python3 -m http.server 8123
```
Then open http://localhost:8123 — or just double-click `index.html`. After editing, hard-refresh (⌘⇧R).

## The one command
After changing anything in `content/`, run:
```
cd path/to/Global-Cornell-Conection   # wherever you cloned it
python3 build.py
```
It rewrites the generated parts of the pages and prints a short report. Nothing else on the site is touched.

## Change the executive board → `content/board.json`
- Edit names, roles, years, majors, emails (set `"show_emails": false` to hide all emails). Phone numbers are never shown.
- Headshot: save a JPEG as `assets/people/first-last.jpg` (lowercase, hyphen, e.g. `assets/people/sophia-jian.jpg`) — it is picked up automatically. Square-ish head-and-shoulders photos, 400–800px, work best. No photo → a quiet empty tile.
- Run `python3 build.py`. The board grid on the Members page updates.

## Change members / alumni → `content/members.json`, `content/alumni.json`
- Members are grouped by the semester they joined; add a person as `{"name": "…", "major": "Economics '29"}` (a photo at `assets/people/first-last.jpg` is optional).
- `"graduated_through"` at the top of members.json is the class year of the newest class that has graduated (`2026` = everyone whose major ends in '26 or earlier). Those members leave the public roster and appear in the members-only alumni directory automatically. Bump it by one each June.
- Alumni: `{"name": "…", "role": "Analyst at Firm"}` in alumni.json. A graduated member is matched to alumni.json by name, so to show where a graduate works, add them there; until then the directory lists their major and class year.
- Run `python3 build.py`. The report names the graduates who have no alumni.json entry yet.

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
- Every alumnus (alumni.json plus every graduated class from members.json) lives behind a shared password at
  `alumni.html`: name, class year and where they work, alphabetical by surname, with a filter box for name, firm
  or class year. The page is encrypted at build time — the published site contains no readable names without the password.
- The password is in `content/alumni-password.txt` (this file is gitignored and must never be committed).
  To change it: edit the file, run `python3 build.py`, push. Share the new password with members.
- Requires the `cryptography` package once per machine: `python3 -m pip install --user cryptography`.
