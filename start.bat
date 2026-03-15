@echo off
echo ============================================
echo   Hollowed Stone — Local Development Server
echo ============================================
echo.
echo   This machine:  http://localhost:8788
echo.
echo   LAN play — share one of these with the other player:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do echo     http://%%a:8788
echo.
echo Press Ctrl+C to stop.
echo.
npx wrangler pages dev public --kv GAME_STATE --port 8788
