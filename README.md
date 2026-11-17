# Last Dawn — Hold the Kingdom

A mobile-first 3D survival / castle-defense game. Single file, zero build step.

**Play:** open `index.html` in any modern browser, or serve it with `python3 -m http.server 8000` and visit `http://localhost:8000`.

## Controls

**Desktop** — WASD to move · drag to rotate · wheel to zoom · Space attack · E gather · F eat · P pause · Q tabs

**Mobile** — left stick to move · drag the world to rotate · pinch to zoom · HIT / GET / EAT / BUILD buttons

## Gameplay

By day: gather, smelt, forge, fortify, recruit. By night: goblins and orcs storm your castle.
Survive 8 nights and break the giant king.

## Crafting

- **Tier gating** — recipes unlock by day (Steel Ingot unlocks Day 3)
- **Tool durability** — Axe and Pickaxe have 120 uses; they break and must be re-crafted
- **Tool requirement** — ore can only be mined with a Pickaxe
- **Level cap** — Sword and Armour cap at Lv3, cost scales per level
- **Build queue** — tap a recipe, move to position the ghost preview, then PLACE

Four tabs: Tools · Gear · Build · Troops

## Self-test

Append `?selftest=1` to the URL to run the built-in regression suite (16 checks).
Results print to the overlay and the document title becomes `OK 16/16`.

Force layout mode for testing with `?mobile=1` or `?desktop=1`.

## Tech

Three.js r128 via CDN. No bundler, no npm, no server logic — everything runs client-side.
