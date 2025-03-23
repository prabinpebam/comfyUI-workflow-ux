@echo off
REM ComfyUI Workflow UX Development Environment Starter
echo ===== Starting ComfyUI Workflow UX Development Environment =====

REM Set environment variables
set NODE_ENV=development
set MONGODB_URI=mongodb://localhost:27017/comfyui-workflow-database
set DATABASE_URL=mongodb://localhost:27017/comfyui-workflow-database
set PORT=8080

REM Create MongoDB data directory if it doesn't exist
if not exist "C:\Users\Prabin Pebam\OneDrive\Projects\mongodb\data" (
  echo Creating MongoDB data directory...
  mkdir "C:\Users\Prabin Pebam\OneDrive\Projects\mongodb\data"
)

REM Create MongoDB log directory if it doesn't exist
if not exist "C:\Users\Prabin Pebam\OneDrive\Projects\mongodb\log" (
  echo Creating MongoDB log directory...
  mkdir "C:\Users\Prabin Pebam\OneDrive\Projects\mongodb\log"
)

REM Start MongoDB in the background
echo Starting MongoDB server...
start "MongoDB Server" cmd /k "mongod --dbpath \"C:\Users\Prabin Pebam\OneDrive\Projects\mongodb\data\" --logpath \"C:\Users\Prabin Pebam\OneDrive\Projects\mongodb\log\mongod.log\" --logappend"

REM Wait for MongoDB to start up
echo Waiting for MongoDB to start...
timeout /t 5

REM Ensure the directories for workflows exist
if not exist "docs\workflow" (
  echo Creating workflow directory...
  mkdir "docs\workflow"
)

REM Create manifest.json if it doesn't exist
if not exist "docs\workflow\manifest.json" (
  echo Creating manifest.json...
  echo {"workflows":[]} > docs\workflow\manifest.json
)

REM Create temp directory if it doesn't exist
if not exist "temp" (
  echo Creating temp directory...
  mkdir "temp"
)

REM Start TypeScript compiler in watch mode and the development server
echo ===== Starting TypeScript compiler in watch mode and development server =====
echo Press Ctrl+C in this window to stop all processes
start "TypeScript Watch" cmd /k "npm run watch"
timeout /t 2
start "Development Server" cmd /k "node server.js"

REM Keep the main script running to handle cleanup when terminated
echo ===== Environment is ready =====
echo The following processes are running:
echo - MongoDB Server
echo - TypeScript Watch
echo - Development Server
echo.
echo Press Ctrl+C in this window to stop all processes
pause

REM When the script is terminated, clean up all processes
echo ===== Cleaning up processes =====
taskkill /FI "WINDOWTITLE eq MongoDB Server" /F
taskkill /FI "WINDOWTITLE eq TypeScript Watch" /F
taskkill /FI "WINDOWTITLE eq Development Server" /F

echo ===== Development environment has been stopped =====