# Specification

## Summary
**Goal:** Improve bot AI so that both the Colonizer and Native Peoples factions coordinate as teams, with role-based behavior and a shared turn-state object that prevents redundant targeting.

**Planned changes:**
- Add a shared bot team state object computed once per team turn (before individual unit decisions) that tracks contested/uncaptured strategic points, critically wounded allies (<30% HP), visible enemy constructions, and already-assigned bot roles (capture, defend, heal, build/destroy).
- Colonizer bot coordination: Engineer bots prioritize building near the Fort; Captain bots reposition toward allied clusters to activate their buff aura; Musket Soldier bots prefer open-field strategic points; Missionary bots prioritize healing wounded allies over engaging enemies; bots spread across all 3 strategic points rather than converging on one.
- Native Peoples bot coordination: Forest Warrior bots position in forest territories and wait for enemies to enter range; Spirit Hunter bots mark high-value enemy targets (e.g., Engineers near the Fort) to guide melee allies; Shaman bots always heal the lowest-health ally first; Sentinel bots prioritize destroying enemy constructions before offensive actions; 2+ Native bots converge on any territory with an active capture countdown.
- Healer-role bots (Shaman, Missionary) skip territory capture when wounded allies are within movement range.
- No two bots on the same team are assigned the same capture-point target unless all other points are already covered.
- All changes confined to `frontend/src/utils/botAI.ts` and any helper utilities it imports.

**User-visible outcome:** Bot teams play more intelligently and cooperatively — units fill distinct roles, healers support wounded allies, attackers spread across objectives, and no two bots wastefully pile onto the same target.
