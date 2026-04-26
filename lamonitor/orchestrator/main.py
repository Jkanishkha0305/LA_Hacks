"""ASI:One Orchestrator - LA Safe Streets Multi-Agent System

Coordinates Vision Analysis, Risk Prediction, and Route Optimization agents
through Agentverse for comprehensive urban safety intelligence.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import aiohttp
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Mock Agentverse SDK for demo (replace with actual SDK when available)
class AgentverseClient:
    pass

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("orchestrator")

# Agent Configuration
ORCHESTRATOR_NAME = "la-safe-streets-orchestrator"
ORCHESTRATOR_VERSION = "1.0.0"

# Agent endpoints
AGENT_ENDPOINTS = {
    "vision": "http://localhost:8001",
    "risk": "http://localhost:8002", 
    "route": "http://localhost:8003"
}

class CameraFrame(BaseModel):
    camera_id: str
    image_b64: str
    location: dict  # lat, lng
    timestamp: str

class SafetyAnalysis(BaseModel):
    camera_id: str
    detected_events: List[dict]
    risk_score: float
    risk_tier: str
    recommended_actions: List[str]

class CitySafetyRequest(BaseModel):
    area_bounds: dict  # lat_min, lat_max, lng_min, lng_max
    hour_of_week: Optional[int] = None
    include_cameras: bool = True

class CitySafetyResponse(BaseModel):
    area_risk_heatmap: List[dict]
    high_risk_cameras: List[dict]
    patrol_routes: List[dict]
    emergency_response_plans: List[dict]
    analysis_timestamp: str

class LASafeStreetsOrchestrator:
    """Main orchestrator for LA Safe Streets multi-agent system"""
    
    def __init__(self):
        self.session = None
        self.agentverse_client = None
        
    async def initialize(self):
        """Initialize HTTP clients and agent connections"""
        self.session = aiohttp.ClientSession()
        
        # Test agent connectivity
        for agent_name, endpoint in AGENT_ENDPOINTS.items():
            try:
                async with self.session.get(f"{endpoint}/health") as resp:
                    if resp.status == 200:
                        log.info(f"Connected to {agent_name} agent at {endpoint}")
                    else:
                        log.warning(f"{agent_name} agent unhealthy: {resp.status}")
            except Exception as e:
                log.error(f"Failed to connect to {agent_name} agent: {e}")
        
        log.info("LA Safe Streets Orchestrator initialized")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    async def analyze_camera_feed(self, frame: CameraFrame) -> SafetyAnalysis:
        """Analyze a camera frame using Vision and Risk agents"""
        try:
            # Step 1: Get risk context for camera location
            h3_index = self._lat_lng_to_h3(frame.location["lat"], frame.location["lng"])
            
            risk_request = {
                "action": "predict_risk",
                "h3_indices": [h3_index],
                "hour_of_week": self._get_hour_of_week()
            }
            
            risk_response = await self._call_agent("risk", "/agentverse/chat", risk_request)
            risk_data = json.loads(risk_response.get("response", "{}"))
            
            risk_score = 0.2  # Default
            risk_tier = "low"
            risk_context = None
            
            if "risk_scores" in risk_data and risk_data["risk_scores"]:
                risk_info = risk_data["risk_scores"][0]
                risk_score = risk_info.get("score", 0.2)
                risk_tier = risk_info.get("tier", "low")
                risk_context = risk_info
            
            # Step 2: Analyze frame with Vision agent
            vision_request = {
                "action": "analyze_frame",
                "image_b64": frame.image_b64,
                "transcript": "",
                "risk_context": risk_context
            }
            
            vision_response = await self._call_agent("vision", "/agentverse/chat", vision_request)
            vision_data = json.loads(vision_response.get("response", "{}"))
            
            detected_events = vision_data.get("events", [])
            
            # Step 3: Generate recommended actions
            recommended_actions = self._generate_actions(detected_events, risk_score, risk_tier)
            
            return SafetyAnalysis(
                camera_id=frame.camera_id,
                detected_events=detected_events,
                risk_score=risk_score,
                risk_tier=risk_tier,
                recommended_actions=recommended_actions
            )
            
        except Exception as e:
            log.error(f"Camera analysis error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_city_safety_overview(self, request: CitySafetyRequest) -> CitySafetyResponse:
        """Get comprehensive city safety analysis"""
        try:
            # Step 1: Get risk heatmap
            heatmap_request = {
                "action": "get_risk_heatmap",
                "hour_of_week": request.hour_of_week
            }
            
            risk_response = await self._call_agent("risk", "/agentverse/chat", heatmap_request)
            risk_data = json.loads(risk_response.get("response", "{}"))
            
            area_risk_heatmap = risk_data.get("risk_scores", [])
            
            # Step 2: Identify high-risk areas for patrol routing
            high_risk_areas = [
                {
                    "location": {
                        "lat": self._h3_to_lat(risk["h3_index"]),
                        "lng": self._h3_to_lng(risk["h3_index"])
                    },
                    "priority": risk["score"],
                    "estimated_time_min": 15.0
                }
                for risk in area_risk_heatmap 
                if risk.get("tier") in ["high", "critical"]
            ]
            
            # Step 3: Generate patrol routes
            if high_risk_areas:
                route_request = {
                    "action": "optimize_route",
                    "start_location": {"lat": 34.0522, "lng": -118.2437},  # Downtown LA
                    "high_risk_areas": high_risk_areas[:10],  # Top 10 areas
                    "max_time_minutes": 120.0,
                    "vehicle_count": 3
                }
                
                route_response = await self._call_agent("route", "/agentverse/chat", route_request)
                route_data = json.loads(route_response.get("response", "{}"))
                patrol_routes = route_data.get("routes", [])
            else:
                patrol_routes = []
            
            # Step 4: Generate emergency response plans
            emergency_plans = []
            for area in high_risk_areas[:5]:  # Top 5 critical areas
                emergency_request = {
                    "action": "get_emergency_route",
                    "start_location": {"lat": 34.0522, "lng": -118.2437},
                    "target_location": area["location"]
                }
                
                emergency_response = await self._call_agent("route", "/agentverse/chat", emergency_request)
                emergency_data = json.loads(emergency_response.get("response", "{}"))
                
                if emergency_data.get("routes"):
                    emergency_plans.extend(emergency_data["routes"])
            
            # Step 5: Identify high-risk cameras (mock data)
            high_risk_cameras = []
            if request.include_cameras:
                for i, risk in enumerate(area_risk_heatmap[:20]):
                    if risk.get("tier") in ["high", "critical"]:
                        high_risk_cameras.append({
                            "camera_id": f"cam-{i:03d}",
                            "location": {
                                "lat": self._h3_to_lat(risk["h3_index"]),
                                "lng": self._h3_to_lng(risk["h3_index"])
                            },
                            "risk_score": risk.get("score", 0.0),
                            "risk_tier": risk.get("tier", "low"),
                            "last_update": datetime.now(timezone.utc).isoformat()
                        })
            
            return CitySafetyResponse(
                area_risk_heatmap=area_risk_heatmap,
                high_risk_cameras=high_risk_cameras,
                patrol_routes=patrol_routes,
                emergency_response_plans=emergency_plans,
                analysis_timestamp=datetime.now(timezone.utc).isoformat()
            )
            
        except Exception as e:
            log.error(f"City safety overview error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def _call_agent(self, agent_name: str, endpoint: str, data: dict) -> dict:
        """Call an agent via HTTP"""
        endpoint_url = f"{AGENT_ENDPOINTS[agent_name]}{endpoint}"
        
        try:
            async with self.session.post(endpoint_url, json=data) as resp:
                if resp.status != 200:
                    raise Exception(f"Agent {agent_name} returned status {resp.status}")
                return await resp.json()
        except Exception as e:
            log.error(f"Error calling {agent_name} agent: {e}")
            raise
    
    def _lat_lng_to_h3(self, lat: float, lng: float) -> str:
        """Convert lat/lng to H3 index"""
        try:
            import h3
            return h3.geo_to_h3(lat, lng, 9)
        except ImportError:
            # Fallback mock
            return f"892e83002837ff{int(lat*100)%16:x}"
    
    def _h3_to_lat(self, h3_index: str) -> float:
        """Convert H3 index to latitude"""
        try:
            import h3
            return h3.h3_to_geo(h3_index)[0]
        except ImportError:
            # Fallback mock for LA area
            return 34.0522 + (hash(h3_index) % 100) * 0.01
    
    def _h3_to_lng(self, h3_index: str) -> float:
        """Convert H3 index to longitude"""
        try:
            import h3
            return h3.h3_to_geo(h3_index)[1]
        except ImportError:
            # Fallback mock for LA area
            return -118.2437 + (hash(h3_index) % 100) * 0.01
    
    def _get_hour_of_week(self) -> int:
        """Get current hour of week (0-167)"""
        now = datetime.now()
        return now.weekday() * 24 + now.hour
    
    def _generate_actions(self, events: List[dict], risk_score: float, risk_tier: str) -> List[str]:
        """Generate recommended actions based on analysis"""
        actions = []
        
        # Check for dangerous events
        dangerous_events = [e for e in events if e.get("isDangerous", False)]
        
        if dangerous_events:
            actions.append("Dispatch patrol unit to investigate detected hazards")
            actions.append("Increase camera monitoring frequency")
        
        if risk_tier == "critical":
            actions.append("Elevate area to high-priority patrol status")
            actions.append("Consider temporary traffic control measures")
        elif risk_tier == "high":
            actions.append("Add to routine patrol checkpoint")
        
        if risk_score > 0.7:
            actions.append("Notify nearby units of elevated risk area")
        
        if not dangerous_events and risk_score < 0.3:
            actions.append("Normal monitoring - no immediate action required")
        
        return actions

# FastAPI App
app = FastAPI(
    title="LA Safe Streets Orchestrator",
    description="Multi-agent urban safety intelligence system",
    version=ORCHESTRATOR_VERSION,
)

orchestrator = LASafeStreetsOrchestrator()

@app.on_event("startup")
async def startup():
    await orchestrator.initialize()

@app.on_event("shutdown")
async def shutdown():
    await orchestrator.cleanup()

@app.post("/analyze/camera")
async def analyze_camera(frame: CameraFrame) -> SafetyAnalysis:
    """Analyze a single camera frame"""
    return await orchestrator.analyze_camera_feed(frame)

@app.post("/analyze/city")
async def analyze_city(request: CitySafetyRequest) -> CitySafetyResponse:
    """Get comprehensive city safety analysis"""
    return await orchestrator.get_city_safety_overview(request)

@app.get("/health")
async def health_check():
    """Health check for orchestrator and all agents"""
    agent_status = {}
    
    for agent_name, endpoint in AGENT_ENDPOINTS.items():
        try:
            async with orchestrator.session.get(f"{endpoint}/health") as resp:
                agent_status[agent_name] = resp.status == 200
        except:
            agent_status[agent_name] = False
    
    all_healthy = all(agent_status.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "agents": agent_status,
        "orchestrator": ORCHESTRATOR_NAME,
        "version": ORCHESTRATOR_VERSION
    }

@app.get("/")
async def root():
    return {
        "service": ORCHESTRATOR_NAME,
        "description": "LA Safe Streets Multi-Agent Orchestrator",
        "version": ORCHESTRATOR_VERSION,
        "agents": list(AGENT_ENDPOINTS.keys()),
        "endpoints": ["/analyze/camera", "/analyze/city", "/health"]
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True
    )
