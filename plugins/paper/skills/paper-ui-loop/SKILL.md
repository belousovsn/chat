---
name: paper-ui-loop
description: Use when the user provides local screenshots, annotated images, or blunt feedback like "this feels wrong" and wants rapid UI iteration. Focus on turning screenshot critique into concrete UX fixes and tight patch loops.
---

# Paper UI Loop

## Use This For

- local screenshots of current app
- annotated screenshots
- side-by-side current vs target comparisons
- fast critique -> code -> screenshot -> critique loops

## Loop

1. Read the complaint literally.
   Translate comments like "too busy", "not Telegram-like", "wrong focus", or "scroll feels broken" into concrete UI structure issues.

2. Pick one primary fix.
   Strong candidates:
   - reduce simultaneous panels
   - move low-frequency tools behind drawer/menu
   - make chat messages own scroll
   - keep latest message near composer
   - improve mobile pane switching

3. Implement one coherent pass.
   Avoid mixing unrelated visual tweaks with interaction fixes.

4. Verify locally.
   Run frontend build/check. Mention if browser-only QA still needed.

5. Ask for the next screenshot/state only after current pass lands.
