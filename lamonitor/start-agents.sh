#!/bin/bash

# LA Safe Streets Multi-Agent System Startup Script
# Launches all 3 agents + orchestrator for Agentverse demo

set -e

echo "🚀 Starting LA Safe Streets Multi-Agent System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to wait for agent to be healthy
wait_for_agent() {
    local agent_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $agent_name to be healthy...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $agent_name is healthy${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}Attempt $attempt/$max_attempts - $agent_name not ready yet${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $agent_name failed to start within timeout${NC}"
    return 1
}

# Check ports
echo "Checking port availability..."
check_port 8001 || exit 1  # Vision Agent
check_port 8002 || exit 1  # Risk Agent  
check_port 8003 || exit 1  # Route Agent
check_port 8080 || exit 1  # Orchestrator

# Install dependencies
echo "Installing dependencies..."
cd agents/vision-agent && pip install -r requirements.txt && cd ../..
cd agents/risk-agent && pip install -r requirements.txt && cd ../..
cd agents/route-agent && pip install -r requirements.txt && cd ../..
cd orchestrator && pip install -r requirements.txt && cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Start agents in background
echo "Starting agents..."

# Vision Analysis Agent (Port 8001)
echo -e "${BLUE}Starting Vision Analysis Agent...${NC}"
cd agents/vision-agent
python main.py > ../../logs/vision-agent.log 2>&1 &
VISION_PID=$!
cd ../..
echo $VISION_PID > pids/vision-agent.pid

# Risk Prediction Agent (Port 8002)
echo -e "${BLUE}Starting Risk Prediction Agent...${NC}"
cd agents/risk-agent
python main.py > ../../logs/risk-agent.log 2>&1 &
RISK_PID=$!
cd ../..
echo $RISK_PID > pids/risk-agent.pid

# Route Optimization Agent (Port 8003)
echo -e "${BLUE}Starting Route Optimization Agent...${NC}"
cd agents/route-agent
python main.py > ../../logs/route-agent.log 2>&1 &
ROUTE_PID=$!
cd ../..
echo $ROUTE_PID > pids/route-agent.pid

# Wait for agents to be healthy
wait_for_agent "Vision Analysis Agent" 8001 || exit 1
wait_for_agent "Risk Prediction Agent" 8002 || exit 1
wait_for_agent "Route Optimization Agent" 8003 || exit 1

# Start Orchestrator (Port 8080)
echo -e "${BLUE}Starting Orchestrator...${NC}"
cd orchestrator
python main.py > ../logs/orchestrator.log 2>&1 &
ORCHESTRATOR_PID=$!
cd ..
echo $ORCHESTRATOR_PID > pids/orchestrator.pid

wait_for_agent "Orchestrator" 8080 || exit 1

echo ""
echo -e "${GREEN}🎉 LA Safe Streets Multi-Agent System is running!${NC}"
echo ""
echo "📍 Agent Endpoints:"
echo "   Vision Analysis Agent:    http://localhost:8001"
echo "   Risk Prediction Agent:     http://localhost:8002"
echo "   Route Optimization Agent:  http://localhost:8003"
echo "   Orchestrator:              http://localhost:8080"
echo ""
echo "🔗 API Documentation:"
echo "   Orchestrator Docs:         http://localhost:8080/docs"
echo "   Vision Agent Docs:         http://localhost:8001/docs"
echo "   Risk Agent Docs:           http://localhost:8002/docs"
echo "   Route Agent Docs:          http://localhost:8003/docs"
echo ""
echo "📊 System Health Check:"
echo "   curl http://localhost:8080/health"
echo ""
echo "🛑 To stop all agents:"
echo "   ./stop-agents.sh"
echo ""
echo -e "${GREEN}Ready for LA Hacks demo! 🚔${NC}"
