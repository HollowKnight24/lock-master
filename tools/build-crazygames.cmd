@echo off
node "D:/cocos/lockmaster-global/tools/check-crazygames-build-fresh.mjs" --start
if errorlevel 1 exit /b 1
start "" /wait /b "C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe" --project "D:/cocos/lockmaster-global" --build "configPath=D:/cocos/lockmaster-global/tools/crazygames-build.json"
if not exist "D:/cocos/lockmaster-global/build/crazygames/index.html" exit /b 1
node "D:/cocos/lockmaster-global/tools/check-crazygames-build-fresh.mjs"
if errorlevel 1 exit /b 1
node "D:/cocos/lockmaster-global/tools/inject-crazygames-config.mjs" "D:/cocos/lockmaster-global/build/crazygames"
if errorlevel 1 exit /b 1
node "D:/cocos/lockmaster-global/tools/optimize-web-images.mjs" "D:/cocos/lockmaster-global/build/crazygames"
if errorlevel 1 exit /b 1
