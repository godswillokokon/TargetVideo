# Aether

Clickable **bare React Native** mock of an anime micro-drama beta app.

Delivers the brief:

1. **Home feed** — hero, categories, poster rows  
2. **Vertical player** with **episode lock after the cliffhanger**  
3. **One unlock flow** — watch a short rewarded ad

No backend. The ad unlock lasts for the rest of that visit. Opening the player again shows the cliff lock.

## Stack

- React Native 0.88 (CLI / bare `ios` + `android`)
- React Navigation (native stack)
- `react-native-video`
- Pure `playbackReducer` (Jest-tested) owns lock / unlock / phase

## Run

```sh
npm install
bundle install          # first time / Ruby deps
npm run pods            # CocoaPods (ios/)
npm start               # Metro
npm run ios             # or: npm run android
```

Requirements: Xcode (iOS), Android Studio / emulator (Android), Node ≥ 22.11.

iOS deployment target is **15.1** (Podfile) so pods build on current Xcode simulator SDKs.

```sh
npm test
npm run typecheck
```

## 2-minute demo script

1. Launch app → **Home** shows **Naruto**.  
2. Tap **Play Now**.  
3. Let episode play ~**19s** (cliff ≈ 20% of `assets/video/naruto/s1e1.mp4`).  
4. Lock sheet appears — tap **Watch a short ad**.  
5. Stay on the ad **5 seconds** (do not close). Playback resumes past the cliff.  
6. Leave the player and open it again. The cliff lock shows again (each visit starts locked).

Optional: during the ad, tap **Simulate no-fill** (`__DEV__`) to exercise the failed-ad path (stays locked).

## Swap the episode video

Replace [`assets/video/naruto/s1e1.mp4`](assets/video/naruto/s1e1.mp4) with your H.264 MP4 (prefer 9:16), and register the file in [`src/data/assets.ts`](src/data/assets.ts). Titles, seasons, episodes, ratings, genres, and shelves live in [`assets/catalog.json`](assets/catalog.json). Cliff time is that episode's `cliffRatio` times duration (currently `0.2` for a short demo wait on the ~96s clip).

## Architecture (why it is shaped this way)

| Piece | Role |
|---|---|
| `playbackReducer` | Only place `unlocked` becomes `true`; clamps past-cliff while locked |
| `usePlaybackController` | Video callbacks only `dispatch`; `phase` owns pause |
| `FakeRewardedAd` | Reward **after** full watch — same idea as TargetVideo / MAX `onUserRewarded`, not on ad open |
| `CliffhangerLock` | UI for the gate; secondary CTAs do not unlock |

Production apps would verify rewards server-side before clearing the gate. This mock keeps the unlock in memory for the current visit only.

## Manual QA checklist

- [ ] Home → Player navigates; Back returns  
- [ ] Video plays with phone silent switch on (iOS)  
- [ ] First launch locks once at cliff; frame does not flash past cliff  
- [ ] Dismiss ad / background app during countdown → still locked  
- [ ] Finish ad → resumes; the rest of that visit does not re-lock  
- [ ] Leave the player and open it again → cliff lock shows again  
- [ ] Bad/missing video → error + Retry, not the paywall  
- [ ] Primary controls have accessibility labels (Play, Watch ad, Maybe later)

## Out of scope

Login, Library, real IAP / coin wallet, real ad mediation SDK, OTT / CTV, CDN / CMS.

## License / assets

See [`assets/ATTRIBUTION.md`](assets/ATTRIBUTION.md). Demo clip rights are the submitter’s responsibility.
