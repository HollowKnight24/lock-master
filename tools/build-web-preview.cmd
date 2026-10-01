@echo off
start "" /wait /b "C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe" --project "D:/cocos/lockmaster-global" --build "configPath=D:/cocos/lockmaster-global/tools/web-preview-build.json"
if not exist "D:/cocos/lockmaster-global/build/web-mobile/index.html" exit /b 1
node "D:/cocos/lockmaster-global/tools/inject-web-trial-config.mjs" "D:/cocos/lockmaster-global/build/web-mobile"
if errorlevel 1 exit /b 1
node "D:/cocos/lockmaster-global/tools/optimize-web-images.mjs" "D:/cocos/lockmaster-global/build/web-mobile"
if errorlevel 1 exit /b 1
