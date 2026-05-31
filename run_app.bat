@echo off
echo ===================================================
echo   AssignAI Premium - Local Development Server
echo ===================================================
echo.
echo Starting local web server to support Puter.js...
echo.
echo Your browser will open automatically.
echo Keep this window open while you use the application!
echo To stop the server, press Ctrl+C in this window.
echo.

:: Open the browser first so it's ready when the server starts
start http://localhost:8000/assignment-generator.html

:: Start the Python HTTP server
python -m http.server 8000

pause
