#!/bin/bash
set -e

echo "=========================================="
echo "  Meshex — Full Stack Startup"
echo "=========================================="

# 1. Install frontend dependencies
echo ""
echo "→ Installing frontend dependencies..."
npm install

# 2. Set up Python virtual environment
echo ""
echo "→ Setting up Python virtual environment..."
cd backend
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt --quiet
cd ..

echo ""
echo "=========================================="
echo "  Starting services..."
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "=========================================="
echo ""

# 3. Start backend in background
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# 4. Start frontend
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
