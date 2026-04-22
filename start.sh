#!/bin/bash

echo "================================"
echo "NovaTech Shop - Quick Start"
echo "================================"
echo ""

# Check if .env file exists
if [ ! -f backend/.env ]; then
    echo "⚠️  Warning: backend/.env file not found!"
    echo "   Please copy backend/.env.example to backend/.env"
    echo "   and add your Fireworks API key."
    echo ""
    exit 1
fi

# Start backend in background
echo "🚀 Starting backend server..."
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "📥 Installing Python dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "🔧 Starting Flask backend on port 5000..."
python app.py &
BACKEND_PID=$!

cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo ""
echo "🚀 Starting frontend server..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Installing npm dependencies..."
    npm install
fi

echo "🔧 Starting Next.js frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "================================"
echo "✅ Both servers are running!"
echo "================================"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for user to press Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
