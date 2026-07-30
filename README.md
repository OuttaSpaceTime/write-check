# Write Check

A local markdown writing checker for German and English. It combines LanguageTool
grammar/spelling checks with an AI-writing-style detector and document metrics, and shows
the findings inline in a CodeMirror editor next to a markdown preview.

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

- `data/document.md` is the document. The editor autosaves 1.2 s after you stop typing and
  polls the file every 2.5 s, so edits made outside the browser appear automatically. A
  concurrent change on disk returns `409` and the UI asks which version to keep.
- `data/review.json` holds review notes: `{"notes":[{quote,title,message,explanation,
  suggestion,severity}]}`. Each `quote` must be a verbatim substring of the document — that
  is what anchors the note to a spot in the editor.
- `node scripts/print-check.mjs [de-DE|en-US]` prints the current findings as JSON.
- `.claude/skills/write-check/SKILL.md` is the agent side of this protocol.

`data/` is gitignored; the documents you check never end up in the repository.

## Tests

    npm test               # vitest — the LanguageTool integration test skips if :8010 is down
    npm run typecheck
