@echo off
title Niro Character Manager
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale em https://www.python.org/downloads/
    pause
    exit /b 1
)

if not exist venv (
    echo Criando ambiente virtual...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Verificando dependencias...
pip install -r requirements.txt --quiet

if not exist .env (
    copy .env.example .env >nul
    echo.
    echo [ATENCAO] Arquivo .env criado. Edite-o e cole sua chave do OpenRouter
    echo           na linha OPENROUTER_API_KEY= para habilitar a IA.
    echo.
)

echo Iniciando o Niro Character Manager...
python app.py
pause
