# Lock Master

A portrait HTML5 timing game built with Cocos Creator 3.8.8 for CrazyGames.

## Game

Normal Mode has five handcrafted locks: linear, half-circle, S-curve, diamond, and ring. Completing all five unlocks the 60-second Challenge Mode. The Records page currently shows a personal Challenge Mode best score saved on the current device; an online leaderboard is not enabled.

## Controls

| Device | Pick | Boost | Pause |
| --- | --- | --- | --- |
| Desktop | Left mouse button | Hold right mouse button | Esc |
| Touchscreen | Tap the bottom-right button | Hold the bottom-left button | Tap the centered button above them |

## Project and validation

Open this folder in Cocos Creator 3.8.8. The authored scene is `assets/scene.scene`. Install the Node dependencies with `npm ci`, then run `npm run qa` for the automated checks. The Windows release scripts in `tools/` are configured for the original local Cocos installation path and may need adjustment on another machine.

The CrazyGames upload ZIP is generated with `npm run crazygames:release` in the configured environment. Generated builds, release archives, engine caches, and local dependencies are intentionally excluded from Git. See `docs/CRAZYGAMES_SUBMISSION.md` for submission notes.
