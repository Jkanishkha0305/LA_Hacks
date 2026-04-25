# LA Hacks 2026 — Project Context

## Hackathon Info
- **Event:** LA Hacks 2026
- **Challenges:** See [LA_Hacks_Challenges.md](./LA_Hacks_Challenges.md) for full challenge list, prizes, and requirements
- **Devpost:** TBD

## Project (TBD)
- **Chosen Challenge(s):** _not decided yet_
- **Project Name:** _TBD_
- **One-liner:** _TBD_
- **Target Users:** _TBD_

## Tech Stack (TBD)
- **Frontend:** _TBD_
- **Backend:** _TBD_
- **AI/ML:** _TBD_
- **Database:** _TBD_
- **Infra/Deploy:** _TBD_

## How to Run
```bash
# TBD once stack is decided
```

## Hackathon Coding Standards

### Speed over perfection
- Skip tests unless logic is genuinely complex
- No abstraction layers you don't need right now
- Hardcode config values if it saves time — clean up before demo
- Ship working demo > clean architecture

### What matters for judging
- Working demo (not just slides)
- Clear problem → solution story
- Hits the specific challenge criteria (check LA_Hacks_Challenges.md)
- Impressive to a non-technical judge

### Code style
- Small focused files
- Explicit error messages (judges see demos, not logs)
- No silent failures — crash loud or show user-friendly message

## Dev Loop (Hackathon)

### Starting a session
1. Read `.ai/session.md` — pick up where you left off
2. Run the app locally to see current state
3. Build the next thing

### Feature cycle
```
describe feature → /plan (optional, for complex things) → build → test in browser → commit
```

### Commit often
```bash
git add -p          # stage only what's done
git commit -m "feat: <what it does>"
```
Small commits = easy to revert if demo breaks at 3am.

### Before demo / submission
- Run the full app fresh (`git clone` + install + run) to catch missing env vars
- Check judging criteria in LA_Hacks_Challenges.md — make sure the demo hits them explicitly
- Record a backup video demo in case live demo fails

### Useful slash commands
- `/plan` — plan a feature before building
- `/ship` — sync, run checks, open PR
- `/review` — quick code review
- `/qa` — QA the current state

## Session Continuity
Check `.ai/session.md` at the start of every session.
Update it at natural checkpoints (after completing a feature, before context gets large).
