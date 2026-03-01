# Specification

## Summary
**Goal:** Make timer text always black and add an "End Turn" button to the game HUD.

**Planned changes:**
- Update `GameTimer.tsx` so all timer text (match countdown and conquest countdown labels and values) is always rendered in black, regardless of warning or critical state; orange/red states only affect background or border indicators.
- Add an "End Turn" button to `GamePage.tsx`, styled with the parchment/period theme, that advances the turn when clicked by the human player.
- Wire the "End Turn" button to the turn-advance logic in `useGameEngine.ts`.
- Disable or hide the "End Turn" button during bot turns and animations.

**User-visible outcome:** Timer text is always legible in black on the parchment background, and human players can explicitly end their turn by clicking the "End Turn" button; bot turns continue automatically.
