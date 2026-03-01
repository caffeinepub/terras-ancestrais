# Specification

## Summary
**Goal:** Build "Terra Defenders," a 2D top-down turn-based land conquest game set in the 16th century, where 8 players (human or bot) are split into two teams — Native Peoples vs Colonizers — and compete over territory control within a 10-minute session.

**Planned changes:**
- **Lobby screen:** 8 player slots, each configurable with a name, Player/Bot toggle, and team assignment (Native Peoples or Colonizers, 4 vs 4). Start Game button activates only when all slots are filled.
- **Game board:** 2D top-down SVG/canvas map with at least 5 distinct territory zones rendered in a 16th-century earthy aesthetic (parchment background, forest greens, ochre, terracotta). Territories display as neutral, native-controlled, or colonizer-controlled.
- **Unit mechanics:** Units have health, attack, and movement range stats. Human players click to select, move, attack, or fortify. Bot units execute AI actions automatically each turn. Health bars visible on units; invalid moves blocked visually.
- **Territory conquest:** Colonizer units occupying a territory uncontested fill a per-territory capture progress bar. When full, the territory flips. Native units can recapture. All territories conquered = Colonizer victory.
- **Game timer:** Prominent 10-minute countdown. Timer reaching zero with unconquered territories = Native Peoples victory. Win condition triggers a game-over screen with winning team name, "Play Again," and "Return to Lobby" options.
- **Backend (Motoko):** Actor stores game session state stably — 8 player slots, territory ownership, unit positions, and timer. Exposes `createGame`, `updateTerritory`, `updateUnitPosition`, and `getGameState` calls. Frontend polls state via React Query.
- **Visual theme:** Consistent 16th-century parchment and earth-tone palette across lobby, game board, and game-over screen. Native Peoples use indigenous-inspired iconography (feathers, tribal motifs); Colonizers use European colonial iconography (galleons, crosses, armor). Period-appropriate serif/display typography.
- **Static assets:** Parchment map background, Native Peoples circular emblem, and Colonizers circular emblem served from `frontend/public/assets/generated`.

**User-visible outcome:** Up to 8 players (or bots) on the same device can configure a lobby, then play a 2D territory-conquest game on a 16th-century styled map. Colonizers try to capture all territories within 10 minutes while Native Peoples defend; the game ends with a clear winner screen.
