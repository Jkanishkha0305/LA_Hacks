#!/usr/bin/env python3
"""
LA Safe Streets Multi-Agent System Demo

Demonstrates the Agentverse multi-agent system for LA Hacks.
Shows Vision Analysis, Risk Prediction, and Route Optimization coordination.
"""

import asyncio
import base64
import json
import time
from datetime import datetime

import aiohttp
import requests

# Demo configuration
ORCHESTRATOR_URL = "http://localhost:8080"
DEMO_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg=="  # 1x1 transparent pixel

class LASafeStreetsDemo:
    def __init__(self):
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def run_demo(self):
        """Run the complete LA Safe Streets demo"""
        print("🚔 LA Safe Streets Multi-Agent System Demo")
        print("=" * 50)
        
        # Check system health
        await self.check_system_health()
        
        # Demo 1: City Safety Overview
        await self.demo_city_safety_overview()
        
        # Demo 2: Camera Frame Analysis
        await self.demo_camera_analysis()
        
        # Demo 3: Individual Agent Capabilities
        await self.demo_individual_agents()
        
        print("\n🎉 Demo completed! System ready for LA Hacks presentation.")
    
    async def check_system_health(self):
        """Check health of all agents"""
        print("\n📊 Checking System Health...")
        
        try:
            async with self.session.get(f"{ORCHESTRATOR_URL}/health") as resp:
                if resp.status == 200:
                    health = await resp.json()
                    print(f"✓ Orchestrator: {health['status']}")
                    
                    for agent, healthy in health['agents'].items():
                        status = "✓" if healthy else "✗"
                        print(f"{status} {agent.title()} Agent: {'Healthy' if healthy else 'Unhealthy'}")
                else:
                    print("✗ Orchestrator not responding")
        except Exception as e:
            print(f"✗ Health check failed: {e}")
            return False
        
        return True
    
    async def demo_city_safety_overview(self):
        """Demo city-wide safety analysis"""
        print("\n🗺️  Demo: City Safety Overview")
        print("-" * 30)
        
        # LA downtown area bounds
        request_data = {
            "area_bounds": {
                "lat_min": 34.0,
                "lat_max": 34.1,
                "lng_min": -118.3,
                "lng_max": -118.2
            },
            "hour_of_week": 14,  # 2 PM on Thursday
            "include_cameras": True
        }
        
        try:
            start_time = time.time()
            async with self.session.post(f"{ORCHESTRATOR_URL}/analyze/city", json=request_data) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    end_time = time.time()
                    
                    print(f"⏱️  Analysis completed in {end_time - start_time:.2f} seconds")
                    print(f"📍 Risk heatmap points: {len(result['area_risk_heatmap'])}")
                    
                    # Count risk tiers
                    tier_counts = {}
                    for point in result['area_risk_heatmap']:
                        tier = point.get('tier', 'unknown')
                        tier_counts[tier] = tier_counts.get(tier, 0) + 1
                    
                    print("📈 Risk distribution:")
                    for tier in ['critical', 'high', 'med', 'low']:
                        count = tier_counts.get(tier, 0)
                        if count > 0:
                            print(f"   {tier.upper()}: {count} areas")
                    
                    print(f"🚔 Patrol routes generated: {len(result['patrol_routes'])}")
                    print(f"🚑 Emergency response plans: {len(result['emergency_response_plans'])}")
                    print(f"📷 High-risk cameras: {len(result['high_risk_cameras'])}")
                    
                else:
                    print(f"✗ City analysis failed: {resp.status}")
        except Exception as e:
            print(f"✗ City analysis error: {e}")
    
    async def demo_camera_analysis(self):
        """Demo single camera frame analysis"""
        print("\n📷 Demo: Camera Frame Analysis")
        print("-" * 30)
        
        # Mock camera frame
        frame_data = {
            "camera_id": "demo-cam-001",
            "image_b64": DEMO_IMAGE_B64,
            "location": {"lat": 34.0522, "lng": -118.2437},
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            start_time = time.time()
            async with self.session.post(f"{ORCHESTRATOR_URL}/analyze/camera", json=frame_data) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    end_time = time.time()
                    
                    print(f"⏱️  Frame analysis completed in {end_time - start_time:.2f} seconds")
                    print(f"📹 Camera: {result['camera_id']}")
                    print(f"⚠️  Risk Score: {result['risk_score']:.3f} ({result['risk_tier'].upper()})")
                    print(f"🔍 Events detected: {len(result['detected_events'])}")
                    
                    for event in result['detected_events']:
                        danger = "⚠️" if event.get('isDangerous') else "✅"
                        print(f"   {danger} {event['description']}")
                    
                    print("📋 Recommended Actions:")
                    for action in result['recommended_actions']:
                        print(f"   • {action}")
                        
                else:
                    print(f"✗ Camera analysis failed: {resp.status}")
        except Exception as e:
            print(f"✗ Camera analysis error: {e}")
    
    async def demo_individual_agents(self):
        """Demo individual agent capabilities"""
        print("\n🤖 Demo: Individual Agent Capabilities")
        print("-" * 30)
        
        # Vision Agent Demo
        print("👁️  Vision Analysis Agent:")
        try:
            vision_request = {
                "action": "analyze_frame",
                "image_b64": DEMO_IMAGE_B64,
                "transcript": "",
                "risk_context": None
            }
            
            async with self.session.post("http://localhost:8001/agentverse/chat", json=vision_request) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    vision_data = json.loads(result.get("response", "{}"))
                    events = vision_data.get("events", [])
                    print(f"   ✓ Analyzed frame, found {len(events)} events")
                else:
                    print(f"   ✗ Vision agent error: {resp.status}")
        except Exception as e:
            print(f"   ✗ Vision agent error: {e}")
        
        # Risk Agent Demo
        print("📊 Risk Prediction Agent:")
        try:
            risk_request = {
                "action": "predict_risk",
                "h3_indices": ["892e83002837ffff"],
                "hour_of_week": 14
            }
            
            async with self.session.post("http://localhost:8002/agentverse/chat", json=risk_request) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    risk_data = json.loads(result.get("response", "{}"))
                    scores = risk_data.get("risk_scores", [])
                    if scores:
                        score = scores[0]
                        print(f"   ✓ Risk score: {score['score']:.3f} ({score['tier']})")
                    else:
                        print("   ✓ Risk agent responded (no data)")
                else:
                    print(f"   ✗ Risk agent error: {resp.status}")
        except Exception as e:
            print(f"   ✗ Risk agent error: {e}")
        
        # Route Agent Demo
        print("🗺️  Route Optimization Agent:")
        try:
            route_request = {
                "action": "optimize_route",
                "start_location": {"lat": 34.0522, "lng": -118.2437},
                "high_risk_areas": [
                    {
                        "location": {"lat": 34.0522, "lng": -118.2437},
                        "priority": 0.8,
                        "estimated_time_min": 15.0
                    }
                ],
                "max_time_minutes": 60.0,
                "vehicle_count": 1
            }
            
            async with self.session.post("http://localhost:8003/agentverse/chat", json=route_request) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    route_data = json.loads(result.get("response", "{}"))
                    routes = route_data.get("routes", [])
                    if routes:
                        route = routes[0]
                        print(f"   ✓ Generated route: {route['total_distance_km']:.2f}km, {route['estimated_time_min']:.1f}min")
                        print(f"   ✓ Risk coverage: {route['risk_coverage_score']:.2f}")
                    else:
                        print("   ✓ Route agent responded (no routes)")
                else:
                    print(f"   ✗ Route agent error: {resp.status}")
        except Exception as e:
            print(f"   ✗ Route agent error: {e}")

def print_startup_instructions():
    """Print instructions for starting the demo"""
    print("🚀 LA Safe Streets Multi-Agent System")
    print("=" * 50)
    print("\nTo start the system:")
    print("1. ./start-agents.sh")
    print("2. python demo.py")
    print("\nTo stop the system:")
    print("1. ./stop-agents.sh")
    print("\nFor manual testing:")
    print("• curl http://localhost:8080/health")
    print("• curl http://localhost:8080/docs")

async def main():
    """Main demo function"""
    if not await check_system_running():
        print("\n❌ System is not running!")
        print("Please start the agents first:")
        print("   ./start-agents.sh")
        return
    
    async with LASafeStreetsDemo() as demo:
        await demo.run_demo()

async def check_system_running():
    """Check if the system is running"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{ORCHESTRATOR_URL}/health") as resp:
                return resp.status == 200
    except:
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print_startup_instructions()
    else:
        asyncio.run(main())
