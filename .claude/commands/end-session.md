---
description: End the current coding session — updates PROGRESS.md, clears CLAUDE.md active session, commits and pushes to GitHub
argument-hint: [optional notes to include in commit message]
---

# End Session

Run these steps in order. Do not skip any step.

## Step 1 — Summarise the session
Review the entire conversation history from this session and identify:
- What was completed
- What was started but not finished
- Any decisions made
- Any blockers or issues found

## Step 2 — Update PROGRESS.md
Rewrite PROGRESS.md with the following structure:

```
# Progress Snapshot
Last updated: {today's date}

## Completed
- [x] {everything done so far across ALL sessions, not just today}

## Up next (start here next session)
- [ ] {most important task first}
- [ ] {second task}
- [ ] {third task}

## Decisions locked in
- {architectural or design decisions that should never be revisited}

## Blockers
- {anything blocked, or "none"}
```

Rules:
- "Completed" is cumulative — include everything done in previous sessions too, not just today
- "Up next" should be ordered — first item is what to do the moment the next session opens
- Keep the whole file under 60 lines

## Step 3 — Update CLAUDE.md active session section
Find the "Active Session" section in CLAUDE.md and update it:

```
## ⚡ Active Session (UPDATE THIS EVERY SESSION)
Current module  : {what module was being worked on today}
Current task    : {the next specific task to pick up — be precise}
Last completed  : {the last thing finished this session}
Blockers        : {any blockers, or "none"}
```

This must reflect what to do NEXT, not what was done today.
So "Current task" should be the NEXT thing to work on when the session resumes.

## Step 4 — Commit and push
1. Stage all changes: `git add .`
2. Write a conventional commit message summarising the session.
   Format: `type(scope): description`
   Examples:
   - `feat(pos-common): add PaymentStatus enums and ApiResponse DTO`
   - `chore(setup): add PROGRESS.md and update CLAUDE.md active session`
   - `feat(pos-domain): add Flyway migrations V1-V3`
   If $ARGUMENTS is provided, append it to the commit message as a note.
3. Push to origin main: `git push origin main`

## Step 5 — Confirm to the user
Print a short summary:
```
Session ended.
Committed: {commit message}
Next session: {one sentence of what to do next}
```