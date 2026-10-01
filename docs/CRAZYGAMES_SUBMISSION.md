# Lock Master — CrazyGames submission

## Build and package

Run `npm run crazygames:release`. Upload `release/lock-master-crazygames.zip` in the CrazyGames Developer Portal. The ZIP root contains `index.html` directly.

Local SDK preview: run `npm run crazygames:preview`, then open `http://127.0.0.1:7457/`. CrazyGames SDK v3 uses its local test environment on localhost.

## Suggested metadata

- Title: **Lock Master**
- Short description: **Time the moving needle, hit the glowing zone, and crack five increasingly tricky locks. Clear Normal Mode to unlock the endless Challenge Mode.**
- Long description: **Test your timing across five handcrafted lock mechanisms: linear, half-moon, S-curve, diamond, and ring. Hit yellow zones to score, catch rare blue zones for bonus time, and hold the boost button when you need extra speed. Complete all five levels to unlock a 60-second Challenge Mode and chase a new personal record.**
- Genre: Casual / Skill
- Orientation: Portrait; playable on desktop with side bars and on touch devices
- Controls: **Mouse / Touch — hold BOOST to speed up; press PICK LOCK when the needle overlaps a glowing zone.**
- Age target: General audience / PEGI 3–7 presentation

## SDK coverage

- CrazyGames HTML5 SDK v3 is loaded before the Cocos bootstrap.
- `loadingStart` / `loadingStop` bracket startup.
- `gameplayStart` / `gameplayStop` track active play and pause/result states.
- `happytime` fires after a successful clear.
- Rewarded ads power retry and one-run Challenge access.
- Midgame ads use the existing global frequency cap at natural result breaks.
- Audio and simulation pause during ads; `game.settings.muteAudio` overrides the in-game sound switch.
- No third-party ad SDK, external login, or mock ads ship in this build.

## Submission notes

The initial Basic Launch may disable monetization even though the SDK is already integrated. Ads become eligible when CrazyGames approves the game for Full Launch. Test the uploaded ZIP with the Developer Portal Preview and QA Tool before submitting.

Official references:

- https://docs.crazygames.com/sdk/intro/
- https://docs.crazygames.com/sdk/video-ads/
- https://docs.crazygames.com/sdk/game/
- https://docs.crazygames.com/requirements/intro/
- https://docs.crazygames.com/requirements/technical/
