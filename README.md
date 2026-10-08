# Write Check

A local markdown writing checker for German and English. It combines LanguageTool
grammar/spelling checks with an AI-writing-style detector and document metrics, and shows
the findings right below the text they are about: the document is split into cells, one small
CodeMirror editor per paragraph, and each cell's feedback sits under it. Cells can be split,
merged, added and deleted; findings can be ticked off as done.

Personal tool, not a product. Its interface is the filesystem: the document and the review
notes are plain files, so an agent can edit the same text you are editing.

## Setup

    npm install
    docker run -d --name languagetool -p 8010:8010 erikvl87/languagetool
    npm run dev            # http://localhost:3456

LanguageTool is optional. Without it the AI-pattern and metrics checks still run and the UI
reports the grammar backend as unavailable; set `LANGUAGETOOL_URL` to use a different host.

## What it checks

- **Grammar and spelling** — LanguageTool at `level=picky`. Markdown markup is masked before
  the request, so code blocks, link targets and heading marks are never flagged.
- **AI writing patterns** — 39 English, 26 German and 12 German-speaker-tell rules in
  `lib/ai/catalog.*.ts`. Every rule carries a `why`, so a finding explains the principle.
- **Document metrics** — burstiness, sentence length, lexical diversity and paragraph
  uniformity (`lib/ai/metrics.ts`).

Checking English always sends `motherTongue=de-DE` to switch on LanguageTool's false-friend
rules.

## Files as the interface

- Each check gets its own directory: `data/checks/<date>-<slug>/` holding `document.md` and
  `review.json`. Open it at `http://localhost:3456/?doc=checks/<date>-<slug>`. The `doc`
  parameter is a path relative to `data/` and is rejected if it escapes it; without it the
  app reads `data/document.md`, the scratch document it used before.
- `document.md` is the document. The editor autosaves 1.2 s after you stop typing and
  polls the file every 2.5 s, so edits made outside the browser appear automatically. A
  concurrent change on disk returns `409` and the UI asks which version to keep.
- `review.json` holds review notes: `{"notes":[{quote,scope,title,message,explanation,
  suggestion,severity}]}`. Each `quote` must be a verbatim substring of the document — that
  is what anchors the note to a spot in the editor. `scope` is optional: `"cell"` for a note
  about the whole paragraph, `"missing"` for something missing after the quote. A note
  without a quote is about the whole text.
- `done.json` lists the findings the user ticked off (`{"done":[key,…]}`).
- `data/words.json` is the word list shared by every check (`{"words":[…]}`): technical
  names such as `esbuild` or `oxc` that LanguageTool doesn't know. Spelling findings on these
  words are dropped, ignoring case. The app reloads the list every 2.5 s.
- `cells.json` records the cell splits and merges that differ from one cell per paragraph
  (`{"splits":[anchor,…],"joins":[anchor,…]}`), each anchored by the first line of the cell
  it starts. The app writes it; without it every paragraph is its own cell.
- `node scripts/print-check.mjs [--doc=checks/<date>-<slug>] [de-DE|en-US]` prints the
  current findings as JSON. It reads the document through the running server, so the `doc`
  parameter means the same thing there as in the browser.
- `.claude/skills/write-check/SKILL.md` is the agent side of this protocol.

`data/` is gitignored; the documents you check never end up in the repository.

## Tests

    npm test               # vitest — the LanguageTool integration test skips if :8010 is down
    npm run typecheck
