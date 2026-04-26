"""Route Optimization Agent - Agentverse Registered Agent

Optimizes patrol routes and response paths using risk-based routing.
Registered on Agentverse with Chat Protocol for ASI:One discovery.
"""

import asyncio
import json
import logging
from typing import List, Optional, Dict, Tuple

import h3
import networkx as nx
import numpy as np
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

# Mock Agentverse SDK for demo (replace with actual SDK when available)
class Agent:
    def __init__(self, name, description, version):
        self.name = name
        self.description = description
        self.version = version
    
    async def initialize(self):
        pass

class AgentverseClient:
    pass

class get_llm_client:
    pass

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("route-agent")

# Agent Configuration
AGENT_NAME = "route-optimization-agent"
AGENT_DESCRIPTION = "Optimizes patrol routes and emergency response paths based on risk predictions"
AGENT_VERSION = "1.0.0"

class Location(BaseModel):
    lat: float
    lng: float
    h3_index: Optional[str] = None

class RoutePoint(BaseModel):
    location: Location
    priority: float  # 0.0 to 1.0
    estimated_time_min: float

class RouteRequest(BaseModel):
    start_location: Location
    high_risk_areas: List[RoutePoint]
    max_time_minutes: float = 60.0
    vehicle_count: int = 1

class OptimizedRoute(BaseModel):
    route_id: str
    waypoints: List[Location]
    total_distance_km: float
    estimated_time_min: float
    risk_coverage_score: float
    instructions: List[str]

class RouteResponse(BaseModel):
    routes: List[OptimizedRoute]
    optimization_version: str
    processing_time_ms: float

class RouteOptimizationAgent(Agent):
    """Route Optimization Agent for Agentverse"""
    
    def __init__(self):
        super().__init__(
            name=AGENT_NAME,
            description=AGENT_DESCRIPTION,
            version=AGENT_VERSION
        )
        self.graph = None
        self.la_roads = None
        
    async def initialize(self):
        """Initialize road network and optimization algorithms"""
        await self._load_road_network()
        log.info("Route Optimization Agent initialized")
        
    async def _load_road_network(self):
        """Load LA road network data"""
        # Mock road network - in production, load from LA Open Data
        self.graph = nx.Graph()
        
        # Create mock road network for LA area
        la_coords = [
            (34.0522, -118.2437),  # Downtown LA
            (34.0522, -118.2637),  # Slightly west
            (34.0622, -118.2437),  # Slightly north
            (34.0422, -118.2437),  # Slightly south
            (34.0522, -118.2237),  # Slightly east
        ]
        
        # Add nodes and edges
        for i, (lat, lng) in enumerate(la_coords):
            self.graph.add_node(i, lat=lat, lng=lng, h3=h3.geo_to_h3(lat, lng, 9))
        
        # Add edges with distances
        for i in range(len(la_coords)):
            for j in range(i+1, len(la_coords)):
                dist = self._haversine_distance(la_coords[i], la_coords[j])
                self.graph.add_edge(i, j, weight=dist)
                
    def _haversine_distance(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """Calculate distance between two coordinates"""
        lat1, lng1 = coord1
        lat2, lng2 = coord2
        
        # Convert to radians
        lat1, lng1, lat2, lng2 = map(np.radians, [lat1, lng1, lat2, lng2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlng/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        # Earth radius in kilometers
        r = 6371
        return c * r
        
    async def process_message(self, message: str) -> str:
        """Process incoming chat protocol messages"""
        try:
            request_data = json.loads(message)
            
            if request_data.get("action") == "optimize_route":
                return await self._optimize_route(request_data)
            elif request_data.get("action") == "get_emergency_route":
                return await self._get_emergency_route(request_data)
            else:
                return json.dumps({
                    "error": f"Unknown action: {request_data.get('action')}"
                })
                
        except Exception as e:
            log.error(f"Error processing message: {e}")
            return json.dumps({"error": str(e)})
    
    async def _optimize_route(self, request_data: dict) -> str:
        """Optimize patrol route covering high-risk areas"""
        try:
            start_location = request_data.get("start_location")
            high_risk_areas = request_data.get("high_risk_areas", [])
            max_time = request_data.get("max_time_minutes", 60.0)
            vehicle_count = request_data.get("vehicle_count", 1)
            
            if not start_location:
                return json.dumps({"error": "Missing start_location field"})
            
            # Convert to internal format
            start_node = self._find_nearest_node(start_location["lat"], start_location["lng"])
            
            # Create route points with priorities
            route_points = []
            for area in high_risk_areas:
                loc = area["location"]
                node = self._find_nearest_node(loc["lat"], loc["lng"])
                route_points.append({
                    "node": node,
                    "priority": area.get("priority", 0.5),
                    "location": loc
                })
            
            # Generate optimized routes
            routes = []
            for vehicle_idx in range(vehicle_count):
                route = self._solve_vrp(start_node, route_points, max_time, vehicle_idx, vehicle_count)
                routes.append(route)
            
            response = RouteResponse(
                routes=routes,
                optimization_version="mock-v1.0",
                processing_time_ms=200.0
            )
            
            return json.dumps(response.dict())
            
        except Exception as e:
            log.error(f"Route optimization error: {e}")
            return json.dumps({"error": str(e)})
    
    async def _get_emergency_route(self, request_data: dict) -> str:
        """Get fastest route for emergency response"""
        try:
            start_location = request_data.get("start_location")
            target_location = request_data.get("target_location")
            
            if not start_location or not target_location:
                return json.dumps({"error": "Missing start_location or target_location"})
            
            start_node = self._find_nearest_node(start_location["lat"], start_location["lng"])
            target_node = self._find_nearest_node(target_location["lat"], target_location["lng"])
            
            # Find shortest path
            try:
                path = nx.shortest_path(self.graph, start_node, target_node, weight="weight")
            except nx.NetworkXNoPath:
                # Fallback to direct route
                path = [start_node, target_node]
            
            # Convert to route format
            waypoints = []
            total_distance = 0.0
            
            for i, node in enumerate(path):
                node_data = self.graph.nodes[node]
                waypoints.append(Location(
                    lat=node_data["lat"],
                    lng=node_data["lng"],
                    h3_index=node_data["h3"]
                ))
                
                if i > 0:
                    prev_node = path[i-1]
                    edge_data = self.graph.edges[prev_node, node]
                    total_distance += edge_data["weight"]
            
            # Estimate time (assuming 40 km/h average speed in urban area)
            estimated_time = (total_distance / 40.0) * 60  # minutes
            
            route = OptimizedRoute(
                route_id=f"emergency-{int(asyncio.get_event_loop().time())}",
                waypoints=waypoints,
                total_distance_km=total_distance,
                estimated_time_min=estimated_time,
                risk_coverage_score=1.0,  # Emergency routes prioritize speed
                instructions=[f"Proceed to target via {len(waypoints)} waypoints"]
            )
            
            return json.dumps({"routes": [route.dict()], "optimization_version": "emergency-v1.0"})
            
        except Exception as e:
            log.error(f"Emergency route error: {e}")
            return json.dumps({"error": str(e)})
    
    def _find_nearest_node(self, lat: float, lng: float) -> int:
        """Find nearest graph node to given coordinates"""
        min_dist = float("inf")
        nearest_node = 0
        
        for node in self.graph.nodes():
            node_data = self.graph.nodes[node]
            dist = self._haversine_distance(
                (lat, lng), 
                (node_data["lat"], node_data["lng"])
            )
            if dist < min_dist:
                min_dist = dist
                nearest_node = node
                
        return nearest_node
    
    def _solve_vrp(self, start_node: int, route_points: List[dict], max_time: float, 
                   vehicle_idx: int, total_vehicles: int) -> OptimizedRoute:
        """Solve Vehicle Routing Problem for patrol optimization"""
        # Simple greedy assignment for demo
        # In production, use cuOpt or advanced VRP solver
        
        # Assign points to this vehicle
        points_per_vehicle = len(route_points) // total_vehicles
        start_idx = vehicle_idx * points_per_vehicle
        end_idx = start_idx + points_per_vehicle
        
        if vehicle_idx == total_vehicles - 1:  # Last vehicle gets remaining points
            end_idx = len(route_points)
        
        assigned_points = route_points[start_idx:end_idx]
        
        # Sort by priority (highest first)
        assigned_points.sort(key=lambda x: x["priority"], reverse=True)
        
        # Build route: start -> highest priority -> next highest -> ...
        route_nodes = [start_node]
        for point in assigned_points:
            route_nodes.append(point["node"])
        
        # Calculate path and distance
        waypoints = []
        total_distance = 0.0
        
        for i, node in enumerate(route_nodes):
            node_data = self.graph.nodes[node]
            waypoints.append(Location(
                lat=node_data["lat"],
                lng=node_data["lng"],
                h3_index=node_data["h3"]
            ))
            
            if i > 0:
                prev_node = route_nodes[i-1]
                try:
                    path = nx.shortest_path(self.graph, prev_node, node, weight="weight")
                    # Add intermediate nodes
                    for intermediate_node in path[1:-1]:
                        intermediate_data = self.graph.nodes[intermediate_node]
                        waypoints.append(Location(
                            lat=intermediate_data["lat"],
                            lng=intermediate_data["lng"],
                            h3_index=intermediate_data["h3"]
                        ))
                    
                    # Add distance for this segment
                    for j in range(len(path)-1):
                        edge_data = self.graph.edges[path[j], path[j+1]]
                        total_distance += edge_data["weight"]
                        
                except nx.NetworkXNoPath:
                    # Direct distance fallback
                    prev_data = self.graph.nodes[prev_node]
                    curr_data = self.graph.nodes[node]
                    direct_dist = self._haversine_distance(
                        (prev_data["lat"], prev_data["lng"]),
                        (curr_data["lat"], curr_data["lng"])
                    )
                    total_distance += direct_dist
        
        # Estimate time
        estimated_time = (total_distance / 30.0) * 60  # 30 km/h patrol speed
        
        # Calculate risk coverage
        risk_coverage = sum(p["priority"] for p in assigned_points) / max(1.0, len(assigned_points))
        
        return OptimizedRoute(
            route_id=f"patrol-vehicle-{vehicle_idx}",
            waypoints=waypoints,
            total_distance_km=total_distance,
            estimated_time_min=estimated_time,
            risk_coverage_score=risk_coverage,
            instructions=[f"Patrol {len(assigned_points)} high-risk areas"]
        )

# FastAPI App
app = FastAPI(
    title="Route Optimization Agent",
    description=AGENT_DESCRIPTION,
    version=AGENT_VERSION,
)

route_agent = RouteOptimizationAgent()

@app.on_event("startup")
async def startup():
    await route_agent.initialize()

@app.post("/optimize")
async def optimize_route(request: RouteRequest) -> RouteResponse:
    """Direct API endpoint for route optimization"""
    result = await route_agent._optimize_route(request.dict())
    result_data = json.loads(result)
    
    if "error" in result_data:
        raise Exception(result_data["error"])
    
    return RouteResponse(**result_data)

@app.post("/emergency")
async def emergency_route(start_location: Location, target_location: Location):
    """Get emergency response route"""
    result = await route_agent._get_emergency_route({
        "start_location": start_location.dict(),
        "target_location": target_location.dict()
    })
    result_data = json.loads(result)
    
    if "error" in result_data:
        raise Exception(result_data["error"])
    
    return result_data

@app.get("/health")
async def health_check():
    return {"status": "healthy", "agent": AGENT_NAME}

@app.get("/")
async def root():
    return {
        "agent": AGENT_NAME,
        "description": AGENT_DESCRIPTION,
        "version": AGENT_VERSION,
        "endpoints": ["/optimize", "/emergency", "/health", "/agentverse/chat"]
    }

# Agentverse Chat Protocol endpoint
@app.post("/agentverse/chat")
async def agentverse_chat(message: dict):
    """Agentverse Chat Protocol endpoint"""
    response = await route_agent.process_message(json.dumps(message))
    return {"response": response}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=True
    )
