@echo off
rem Prepares the website for a manual Netlify deploy: copies deploy\ into netlify-upload\
rem without the editor folders (.impeccable, .vscode), then opens it. Drag the opened
rem netlify-upload folder onto the site's Deploys page in Netlify.

cd /d "%~dp0"
robocopy deploy netlify-upload /MIR /XD .impeccable .vscode /NFL /NDL /NJH /NJS /NP >nul
if %ERRORLEVEL% GEQ 8 (
    echo Kopirovani selhalo.
    pause
    exit /b 1
)
rem Secret pages (private-pages\, kept out of git because the repo is public) go to the site's root:
rem private-pages\<name>\ becomes scanity.cz/<name>/
if exist private-pages (
    robocopy private-pages netlify-upload /E /XF README.txt /NFL /NDL /NJH /NJS /NP >nul
    if errorlevel 8 (
        echo Kopirovani tajnych stranek selhalo.
        pause
        exit /b 1
    )
)
echo Hotovo: slozka netlify-upload je pripravena. Pretahni ji do Netlify (Deploys).
start "" explorer "%~dp0netlify-upload"
