#!/bin/bash

# LA Safe Streets Multi-Agent System Stop Script

set -e

echo "🛑 Stopping LA Safe Streets Multi-Agent System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop agent by PID file
stop_agent() {
    local agent_name=$1
    local pid_file="pids/${2}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Stopping $agent_name (PID: $pid)...${NC}"
            kill "$pid"
            
            # Wait for process to stop
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${RED}Force killing $agent_name${NC}"
                kill -9 "$pid"
            fi
            
            echo -e "${GREEN}✓ $agent_name stopped${NC}"
        else
            echo -e "${YELLOW}$agent_name was not running${NC}"
        fi
        
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}No PID file found for $agent_name${NC}"
    fi
}

# Create directories if they don't exist
mkdir -p pids logs

# Stop all agents
stop_agent "Orchestrator" "orchestrator"
stop_agent "Route Optimization Agent" "route-agent"
stop_agent "Risk Prediction Agent" "risk-agent"
stop_agent "Vision Analysis Agent" "vision-agent"

# Clean up any remaining processes on our ports
echo "Cleaning up any remaining processes..."
for port in 8001 8002 8003 8080; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
        kill -9 "$pid" 2>/dev/null || true
    fi
done

echo -e "${GREEN}✓ All agents stopped${NC}"
echo "📝 Logs are available in the logs/ directory"
