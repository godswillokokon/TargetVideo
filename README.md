# Aether

Bare React Native mock: home feed, portrait player, cliff lock, one rewarded-ad unlock per visit.

## Run

```sh
npm install
bundle install
npm run pods
npm start
npm run ios
```

`npm run android` for the emulator. Node ≥ 22.11. Ruby 3.2.3. iOS 15.1.

```sh
npm test
npm run typecheck
npm run lint
```

## Demo

<video src="https://github.com/user-attachments/assets/d2129508-341f-42f4-b230-be02e1c36775" controls muted playsinline width="360"></video>

1. **Play Now** on Naruto.
2. Cliff at ~19s (`cliffRatio` 0.2 of `assets/video/naruto/s1e1.mp4`).
3. **Watch a short ad** for 5s. Playback resumes.
4. Leave and reopen. Locked again.


Catalog: [`assets/catalog.json`](assets/catalog.json). Only Naruto s1e1 has a video, registered in [`src/data/assets.ts`](src/data/assets.ts).
