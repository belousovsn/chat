---
name: figma-ui-bridge
description: Use when the user provides Figma frame screenshots, design exports, or mockups and wants the repo UI aligned to them. Focus on extracting structure, hierarchy, hidden-vs-visible behavior, spacing, and component states, then implement one focused frontend slice at a time.
---

# Figma UI Bridge

## Use This For

- Figma frame screenshots
- PNG exports from design files
- pasted design specs
- "make current UI match this design"

## Workflow

1. Identify the main surface in the design.
   Usually: navigation shell, list pane, active panel, drawer, modal, or mobile state.

2. Extract behavior before pixels.
   Decide:
   - what stays visible
   - what hides behind menu or drawer
   - which pane scrolls
   - what action stays pinned

3. Map design elements onto existing codebase structure.
   Reuse repo components and patterns where possible. Do not invent a parallel design system unless the task requires it.

4. Implement the highest-leverage mismatch first.
   Prefer solving navigation and interaction model before color or decorative polish.

5. Validate with the frontend build/check command after edits.

## Notes

- If the user only has screenshots and no live Figma connector, continue from screenshots.
- Ask for another screenshot only when the next state is truly needed.
