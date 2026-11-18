# Holdfast

A browser tower-defense game with a tower and upgrade system inspired by BTD6. Creeps follow a marsh road from a blight rift to the citadel gate. Place towers on the grass, earn gold from kills, and hold the line through escalating waves.

## Demo

A 51-second playthrough: the title screen, placing Sentry, Glaive, and Burr, sending waves at 2×, and buying the Point and Volley upgrades.

[Watch the demo](demo/holdfast.mp4)

## Play

- Place **Sentry**, **Burr**, **Glaive**, **Rime**, **Mortar**, **Lance**, and **Stake** towers. Each has its own range, cost, and shot.
- Every tower has three named upgrade paths. One path can reach tier 3. A second path stops at tier 2. The third stays shut.
- Shells ignore sharp steel. Wisps stay hidden until a path grants sight. Clusters split into Grubs. Stakes sit on the road and hit everything, including Wisps.
- Change targeting: First, Last, Close, or Strong.
- Send the next wave, pause, or run at 2× speed.
- Lives, gold, and the current wave stay on screen. Clear every wave to win, or restart after a loss.

Best score is saved in the browser.

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on port 8080.

```bash
npm run typecheck
npm run build
```
