@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Se necesita Node.js 20 o posterior para iniciar el juego.
  echo Instala Node.js y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias locales por primera vez...
  call npm install
  if errorlevel 1 (
    echo [ERROR] No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo Preparando Cimentaciones: Obra Real en http://127.0.0.1:5197 ...
echo Para cerrar el servidor, vuelve a esta ventana y pulsa Ctrl+C.
set "OPEN_OPTION=--open /?autostart=1"
if /I "%~1"=="--no-open" set "OPEN_OPTION="
call npx vite --host 127.0.0.1 --port 5197 --strictPort %OPEN_OPTION%

endlocal
