# Contributing to the GCC site

## One-time setup
1. Install [VS Code](https://code.visualstudio.com) and [GitHub Desktop](https://desktop.github.com)
   (or plain git, if you prefer the terminal).
2. Make a free GitHub account and ask Andrew to add you as a collaborator
   (repo → Settings → Collaborators). Accept the email invite.
3. Clone: GitHub Desktop → File → Clone Repository →
   `andwchin7-dot/Global-Cornell-Conection` → pick a folder you'll remember.
4. VS Code → File → Open Folder → that folder.
5. Recommended: install the **Claude Code** extension in VS Code
   (Extensions panel → search "Claude Code" → install → sign in), or run
   `claude` in the VS Code terminal. Ask it questions about this codebase —
   it reads CLAUDE.md and knows the conventions.

## Every change
1. **Pull first** (GitHub Desktop → Fetch origin → Pull) so you start from the latest.
2. **Branch** — name it `yourname/what-it-does`, e.g. `andrea/fix-board-photos`.
3. **Edit.** UPDATING.md says what lives where. After editing anything in
   `content/`, run `python3 build.py` in the terminal (Terminal → New Terminal).
4. **Preview:** `python3 -m http.server 8123` → http://localhost:8123.
   Check it at phone width too (narrow the window).
5. **Commit** the JSON *and* the regenerated pages together, push the branch,
   and open a **Pull Request** on GitHub.
6. A board member reviews and merges. **Merging to `main` deploys** —
   gcccornell.com updates about a minute later.

## House rules
- Never push straight to `main`; always branch + PR, so the live site never
  receives an unreviewed change.
- Never commit `content/alumni-password.txt`. It is gitignored — leave it that way.
- Run `python3 build.py` after content edits; the generated pages must match the JSON.
- Design changes bigger than a text/photo swap: talk to the president or
  creative director first. The site has a deliberate visual system.

## The alumni directory password
Rebuilding the encrypted alumni page needs `content/alumni-password.txt`.
Without it, your build simply skips that page (fine for most changes). If your
change touches `content/alumni.json`, ask a board member for the password file —
never post it in a group chat, and never commit it.
