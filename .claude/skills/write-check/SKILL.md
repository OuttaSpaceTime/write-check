---
name: write-check
description: Open the local Write Check app (markdown grammar, spelling and AI-style checker for German and English) and collaborate on a text. Use when the user wants to check, improve, or draft a text, wants writing feedback (logic, clarity, style), or types /write-check. Arguments are optional and may be the text itself or instructions on what to write.
---

# Write Check

Local Next.js app at `/home/felix/Code/Misc/write-check`, served on **http://localhost:3456**. It checks markdown text for grammar/spelling (LanguageTool, German + English), AI-writing patterns (rule catalog + document statistics), and shows Claude review notes. The goal is not only fixing texts but helping Felix improve as a writer — feedback must always explain *why* something is a problem.

## Start the services

1. Dev server: `curl -sf http://localhost:3456/api/review >/dev/null 2>&1` — if this fails, run `npm run dev` in the app directory as a background task and wait until the URL responds.
2. LanguageTool: `docker start languagetool 2>/dev/null || docker run -d --name languagetool -p 8010:8010 erikvl87/languagetool`

## One directory per check

Every new check gets its own directory inside the app: `data/checks/<YYYY-MM-DD>-<slug>/`, holding `document.md` and `review.json`. The date is today, the slug a short kebab-case name for the topic (`2026-09-10-hyprland-post`, `2026-09-10-knowledge-card-draft`). Never write into `data/document.md` — that is the old shared scratch document.

- Pick the path once at the start of a check and keep using it for the rest of the conversation: further edits, rewrites and review notes go into that same directory.
- A new `/write-check` invocation, or a text that is plainly a different piece of writing, gets a new directory. Earlier checks stay readable where they are.
- Before picking a slug, `ls data/checks/` — if the user is continuing a text you already worked on, reuse its directory instead of making a near-duplicate.

Open the app on that check:

```
xdg-open 'http://localhost:3456/?doc=checks/<YYYY-MM-DD>-<slug>'
```

Tell the user the relative path you chose, so they can reopen it later.

## The document

- The single source of truth is `document.md` inside the check directory. The browser editor and this file sync automatically every ~2.5 s (last writer wins; the app also autosaves edits made in the browser back to this file).
- `/write-check <text>` → Write the given text to `document.md`, then open the app on that check.
- `/write-check <instructions>` → Draft the text yourself, write it to `document.md`, then open the app. When drafting: be concrete and specific, avoid the AI-boilerplate the app flags (delve, tapestry, "plays a pivotal role", "in today's digital age", formulaic transitions, em-dash chains, uniform sentence rhythm — and the German equivalents: "in der heutigen digitalen Welt", "spielt eine entscheidende Rolle", "zudem"-chains, Fazit-Formeln). Write like a person with an opinion, not a brochure.
- `/write-check` with no arguments → ask which text this is about, or start an empty check directory and open the app on it.
- When the user asks you to correct or rewrite something: edit the check's `document.md` directly with the Edit tool; the browser picks it up automatically.

## Giving feedback (review notes)

Write your feedback to `review.json` next to the document in the same check directory. The UI merges it into the "What to correct" list within ~2.5 s, labeled "Claude". Format:

```json
{
  "notes": [
    {
      "quote": "exact substring copied from document.md",
      "title": "Contradicts earlier claim",
      "message": "What is wrong, in one or two sentences.",
      "explanation": "Why this is a problem — teach the underlying writing principle.",
      "suggestion": "Optional concrete rewrite.",
      "severity": "warning"
    }
  ]
}
```

Rules:
- `quote` must be copied verbatim from the current `document.md` so the note anchors to the right spot (it becomes clickable and underlined in the editor). Notes anchor to the FIRST occurrence of the quote — if the phrase appears more than once, extend the quote until it is unique. Omit `quote` only for document-level notes (structure, ordering, missing sections).
- `severity`: `"error"` (broken logic, factual contradiction), `"warning"` (unclear, weak argument), `"info"` (style polish).
- Review for: **logic soundness** (does each claim follow from its support? non-sequiturs? contradictions? unsupported leaps?), **clarity** (is the point of each section stated and reachable? undefined jargon? buried lede?), and anything discussed in the current chat — feedback the user gave you or conclusions from your discussion belong in the notes too, so the app shows one consolidated list.
- Every note must teach: always fill `explanation` with the principle, not just the fix.
- Replace the whole file each time; write `{"notes": []}` to clear. Notes whose quote no longer matches the text are shown unanchored automatically.

## Reading the app's own findings

To see what the automated checks currently flag (grammar, spelling, AI patterns, metrics), run in the app directory:

```
node scripts/print-check.mjs --doc=checks/<YYYY-MM-DD>-<slug>
```

Append `de-DE` or `en-US` to force the language. Use this before discussing the text so your feedback and the app's findings don't contradict each other, and to answer questions like "why is this flagged?".
