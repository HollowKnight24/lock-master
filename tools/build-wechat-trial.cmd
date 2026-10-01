@echo off
start "" /wait /b "C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe" --project "D:/cocos/lockmaster-global" --build "configPath=D:/cocos/lockmaster-global/tools/wechat-trial-build.json"
if not exist "D:/cocos/lockmaster-global/build/wechatgame-trial/game.js" exit /b 1
node "D:/cocos/lockmaster-global/tools/inject-wechat-trial-config.mjs" "D:/cocos/lockmaster-global/build/wechatgame-trial"
