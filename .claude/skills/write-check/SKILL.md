---
name: write-check
description: Open the local Write Check app (markdown grammar, spelling and AI-style checker for German and English) and collaborate on a text. Use when the user wants to check, improve, or draft a text, wants writing feedback (logic, clarity, style), or types /write-check. Arguments are optional and may be the text itself or instructions on what to write.
---

# Write Check

Local Next.js app at `/home/felix/Code/Misc/write-check`, served on **http://localhost:3456**. It checks markdown text for grammar/spelling (LanguageTool, German + English), AI-writing patterns (rule catalog + document statistics), and shows Claude review notes. The goal is not only fixing texts but helping Felix improve as a writer — feedback must always explain *why* something is a problem.

## Start the services

1. Dev server: `curl -sf http://localhost:3456/api/review >/dev/null 2>&1` — if this fails, run `npm run dev` in the app directory as a background task and wait until the URL responds.
2. LanguageTool: `docker start languagetool 2>/dev/null || docker run -d --name languagetool -p 8010:8010 erikvl87/languagetool`
3. Open the app for the user: `xdg-open http://localhost:3456`

## The document

- The single source of truth is `data/document.md` inside the app directory. The browser editor and this file sync automatically every ~2.5 s (last writer wins; the app also autosaves edits made in the browser back to this file).
- `/write-check <text>` → Write the given text to `data/document.md`, then open the app.
- `/write-check <instructions>` → Draft the text yourself, write it to `data/document.md`, then open the app. When drafting: be concrete and specific, avoid the AI-boilerplate the app flags (delve, tapestry, "plays a pivotal role", "in today's digital age", formulaic transitions, em-dash chains, uniform sentence rhythm — and the German equivalents: "in der heutigen digitalen Welt", "spielt eine entscheidende Rolle", "zudem"-chains, Fazit-Formeln). Write like a person with an opinion, not a brochure.
- `/write-check` with no arguments → just open the app with the current document.
- When the user asks you to correct or rewrite something: edit `data/document.md` directly with the Edit tool; the browser picks it up automatically.

## Giving feedback (review notes)

Write your feedback to `data/review.json` in the app directory. The UI merges it into the "What to correct" list within ~2.5 s, labeled "Claude". Format:

```json
{
  "notes": [
    {
      "quote": "exact substring copied from data/document.md",
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
- `quote` must be copied verbatim from the current `data/document.md` so the note anchors to the right spot (it becomes clickable and underlined in the editor). Notes anchor to the FIRST occurrence of the quote — if the phrase appears more than once, extend the quote until it is unique. Omit `quote` only for document-level notes (structure, ordering, missing sections).
- `severity`: `"error"` (broken logic, factual contradiction), `"warning"` (unclear, weak argument), `"info"` (style polish).
- Review for: **logic soundness** (does each claim follow from its support? non-sequiturs? contradictions? unsupported leaps?), **clarity** (is the point of each section stated and reachable? undefined jargon? buried lede?), and anything discussed in the current chat — feedback the user gave you or conclusions from your discussion belong in the notes too, so the app shows one consolidated list.
- Every note must teach: always fill `explanation` with the principle, not just the fix.
- Replace the whole file each time; write `{"notes": []}` to clear. Notes whose quote no longer matches the text are shown unanchored automatically.

## Reading the app's own findings

To see what the automated checks currently flag (grammar, spelling, AI patterns, metrics), run in the app directory:

```
node scripts/print-check.mjs
```

Use this before discussing the text so your feedback and the app's findings don't contradict each other, and to answer questions like "why is this flagged?".
