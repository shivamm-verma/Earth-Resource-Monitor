# Installation Guide

This project has two parts:
- Client (React + Vite)
- Server (Flask + Google Earth Engine)

## 1. Clone and open project

```bash
git clone https://github.com/shivamm-verma/Earth-Resource-Monitor.git
cd Earth-Resource-Monitor
```

## 2. Server setup (Python + venv)

### Create virtual environment

Windows (PowerShell):
```powershell
cd Server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Windows (CMD):
```cmd
cd Server
python -m venv .venv
.venv\Scripts\activate.bat
```

macOS/Linux:
```bash
cd Server
python3 -m venv .venv
source .venv/bin/activate
```

### Install backend dependencies

```bash
pip install -r requirements.txt
```

### Configure environment variables

1. Copy the example file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

2. Open `.env` and fill values using your Google service account key details.

Important for `GEE_PRIVATE_KEY`:
- Keep it in one line.
- Replace line breaks with `\\n`.

### Run backend

```bash
python app.py
```

Backend runs on: `http://localhost:5000`

## 3. Client setup (React)

In a new terminal:

```bash
cd Client
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

## 4. Deactivate virtual environment

```bash
deactivate
```
---

Example fetch url: 
```sh
http://127.0.0.1:5000/api/vegetation?lat=28.61&lon=77.20&start_date=2023-01-01&end_date=2023-12-31
```
