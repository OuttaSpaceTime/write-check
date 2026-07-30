# write-check

Next.js 16 app (React 19, TypeScript, vitest) that checks markdown prose in German and
English. See `README.md` for setup and the file-based document/review protocol.

## The invariant: offsets index the original text

`Issue.offset`/`Issue.length` are always indices into the raw markdown the user typed.
CodeMirror underlines, the issue popover and the review-note anchors all depend on it, and a
one-character drift silently underlines the wrong word.

- `proseOnly()` in `lib/markdown/mask.ts` blanks markup by overwriting it with spaces and
  never touches `\n`, so the masked string has exactly the same length as the original.
- LanguageTool is sent an annotation payload (`lib/markdown/annotation.ts`), not stripped
  text, so the offsets it returns already point into the original document.
- Never trim, normalize, or re-wrap text before checking it. When you add a check, assert
  offsets by slicing: `text.slice(issue.offset, issue.offset + issue.length)`.

## Layout

- `app/api/check` — the only check endpoint: runs LanguageTool and the AI analysis, merges
  both issue lists and sorts by offset. LanguageTool failures degrade to a status, not a 500.
- `app/api/document`, `app/api/review` — the bridge to `data/`; both tolerate missing files.
- `lib/check/languagetool.ts` — LT client plus the `LtMatch` → `Issue` mapping.
- `lib/ai/` — `patterns.ts` is the rule engine, `catalog.*.ts` the rules, `metrics.ts` the
  document statistics, `segment.ts` word/sentence splitting.
- `lib/markdown/` — offset-preserving masking and the LT annotation payload.
- `lib/review.ts` — resolves `data/review.json` notes to issues by locating each `quote`.
- `components/` — `App.tsx` holds all state and the sync loops; the rest is presentational.

## Adding an AI-pattern rule

Append it to `lib/ai/catalog.en.ts`, `catalog.de.ts` or `catalog.de-speaker.ts` (transfer
errors typical for German natives writing English, mixed into the English run). Fill both
`why` (the principle) and `suggestion` (the fix) — findings are meant to teach, so a rule
without a `why` is not finished. Use `raw: true` only for rules that must see markup.

Then extend `tests/catalog.{en,de}.research.test.ts` with **two** cases: a realistic sample
the rule must flag, and a clean human sentence it must leave alone. The stays-clean case is
the point — this runs on real texts, where a false positive costs more than a miss.

## Working rules

- Test first, especially for offset and pattern work: `npm test`, then `npm run typecheck`.
  Tests mirror `lib/`. The LanguageTool integration test skips itself when `:8010` is down,
  so a green run does not prove the LT path works — start the container to test it.
- `data/` is runtime state and gitignored. Never commit documents, and never make the app
  depend on those files existing.
- No comments in new code; name things so the code reads without them.
- Before adding a dependency, note that the global npm config rejects any release younger
  than four days and disables install scripts.
