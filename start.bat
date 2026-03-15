@echo off
echo ============================================
echo   Ouroboros — Local Development Server
echo ============================================
echo.
echo Starting on http://localhost:8788
echo Press Ctrl+C to stop.
echo.
npx wrangler pages dev public --kv GAME_STATE --port 8788
