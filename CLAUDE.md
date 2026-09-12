# GCC Cornell website — Claude Code notes

Static site, no frameworks. Live at https://www.gcccornell.com via GitHub Pages
from `main` — pushing/merging to main deploys in about a minute.

## Commands
- Build: `python3 build.py` — regenerates members.html and alumni.html from
  `templates/` + `content/*.json`, re-syncs nav/footer partials into every page,
  refreshes generated blocks (Home wall/carousel/pillars, About), and stamps
  `?v=` cache-busters. Run after ANY change to `content/` or `partials/`, and
  commit the regenerated pages together with the source change.
- Preview: `python3 -m http.server 8123` → http://localhost:8123
- Dependencies: Python 3 stdlib; `cryptography` only for the alumni directory.

## Architecture
- `content/*.json` is the single source of truth for people/photos/text.
- members.html and alumni.html are FULLY generated — hand edits are lost on build.
- index.html and about.html contain generated blocks between
  `<!-- build:NAME -->` markers — same rule inside those.
- styles.css: design tokens up top (`--cream`, `--ink`, `--carnelian`…);
  later blocks deliberately override earlier ones — append, don't reorder.
- Design register: quiet editorial. Instrument Serif/Sans, carnelian accents on
  cool paper. Hover effects live behind `@media (hover: hover)`;
  `prefers-reduced-motion` is respected globally. Match this register.

## Cautions
- `content/alumni-password.txt` is the directory secret: gitignored. Never
  commit, print, or paste it. If missing, the build skips alumni.html by design.
- This repo is PUBLIC. No contact info, keys, or private data in commits.
- `CNAME` must keep `www.gcccornell.com`.
- People photos: `assets/people/first-last.jpg`; face crops are solved values
  in `content/crops.json` — don't regenerate them casually.

UPDATING.md = content how-tos. CONTRIBUTING.md = team workflow.
