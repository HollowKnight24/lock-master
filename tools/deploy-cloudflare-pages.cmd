@echo off
setlocal
set "npm_config_cache=%~dp0..\temp\wrangler-npm-cache"
call npm run web:trial:build
if errorlevel 1 exit /b %errorlevel%
call npm run web:trial:verify
if errorlevel 1 exit /b %errorlevel%
npx --yes wrangler@latest pages deploy build/web-mobile --project-name lock-master-trial --branch main --commit-dirty=true
