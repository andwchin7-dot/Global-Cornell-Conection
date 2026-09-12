# gcccornell.com — Global Cornell Connection

The website of Global Cornell Connection (GCC), Cornell's business & professional
community. Live at **https://www.gcccornell.com**, served by GitHub Pages straight
from `main` — merging to `main` **is** deploying (live ~1 minute later).

Plain HTML/CSS/JS plus one Python build script. No frameworks, nothing to install
beyond Python 3 (already on every Mac).

## Run it locally
```
python3 -m http.server 8123
```
Open http://localhost:8123.

## Make a change
1. Edit content in `content/*.json` (people, alumni, photos) or the HTML/CSS directly.
2. Run `python3 build.py` — regenerates the pages from content + templates.
3. Hard-refresh the browser (⌘⇧R) and check it looks right, desktop and phone width.
4. Commit on a branch and open a pull request — see **CONTRIBUTING.md**.

## Read next
- **UPDATING.md** — what to edit for every kind of content change
- **CONTRIBUTING.md** — one-time setup and the team workflow
- **CLAUDE.md** — orientation for Claude Code sessions

## Map
| Path | What it is |
|---|---|
| `content/*.json` | People, photos, text — most edits happen here |
| `build.py` | Regenerates members/alumni pages + generated blocks, stamps cache-busters |
| `templates/`, `partials/` | Page templates and the shared nav/footer |
| `styles.css` | The entire design system |
| `site.js` | Loader, reveals, carousel, the firm wall |
| `assets/` | Photos, firm logos, hero video |

This repo is public: never commit `content/alumni-password.txt` (it is gitignored)
or anything private.
