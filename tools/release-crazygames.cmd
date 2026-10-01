@echo off
call npm run crazygames:build
if errorlevel 1 exit /b %errorlevel%
call npm run crazygames:verify
if errorlevel 1 exit /b %errorlevel%
call npm run crazygames:package
