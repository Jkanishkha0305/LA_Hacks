"""Risk Prediction Agent - Agentverse Registered Agent

Predicts neighborhood risk scores using Open Data and ML models.
Registered on Agentverse with Chat Protocol for ASI:One discovery.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import h3
import numpy as np
import pandas as pd
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.ensemble import RandomForestClassifier

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
log = logging.getLogger("risk-agent")

# Agent Configuration
AGENT_NAME = "risk-prediction-agent"
AGENT_DESCRIPTION = "Predicts neighborhood risk scores using LA Open Data and machine learning models"
AGENT_VERSION = "1.0.0"

class RiskScore(BaseModel):
    h3_index: str
    score: float
    tier: str  # low, med, high, critical
    reasons: List[str]
    features: Dict[str, float]
    window_start: str
    window_end: str

class RiskRequest(BaseModel):
    h3_indices: List[str]
    hour_of_week: Optional[int] = None
    categories: Optional[List[str]] = None

class RiskResponse(BaseModel):
    risk_scores: List[RiskScore]
    model_version: str
    processing_time_ms: float

class RiskPredictionAgent(Agent):
    """Risk Prediction Agent for Agentverse"""
    
    def __init__(self):
        super().__init__(
            name=AGENT_NAME,
            description=AGENT_DESCRIPTION,
            version=AGENT_VERSION
        )
        self.model = None
        self.feature_columns = [
            "crime_90d", "collision_365d", "streetlight_30d", 
            "graffiti_30d", "dumping_30d", "hour_of_week", "is_weekend"
        ]
        
    async def initialize(self):
        """Initialize ML model and load data"""
        await self._load_model()
        await self._load_la_data()
        log.info("Risk Prediction Agent initialized")
        
    async def _load_model(self):
        """Load or train the risk prediction model"""
        # Mock model for demo - in production, load trained cuML model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        # Mock training data
        X_mock = np.random.rand(1000, len(self.feature_columns))
        y_mock = np.random.choice([0, 1], 1000, p=[0.8, 0.2])  # 20% risk events
        self.model.fit(X_mock, y_mock)
        
    async def _load_la_data(self):
        """Load LA Open Data for risk features"""
        # Mock LA data - in production, load from LA Open Data portals
        self.la_data = {}
        
        # Generate mock H3 cells for LA area
        la_center = h3.geo_to_h3(34.0522, -118.2437, 9)  # Downtown LA
        self.mock_h3_cells = []
        
        for i in range(100):  # 100 mock hex cells
            # Generate cells around LA center
            if i == 0:
                cell = la_center
            else:
                # Get neighboring cells
                k = i % 5 + 1
                neighbors = h3.grid_disk(la_center, k)
                if i < len(neighbors):
                    cell = neighbors[i]
                else:
                    cell = h3.geo_to_h3(
                        34.0522 + (i % 100) * 0.01,
                        -118.2437 + (i % 50) * 0.01,
                        9
                    )
            self.mock_h3_cells.append(cell)
            
    async def process_message(self, message: str) -> str:
        """Process incoming chat protocol messages"""
        try:
            request_data = json.loads(message)
            
            if request_data.get("action") == "predict_risk":
                return await self._predict_risk(request_data)
            elif request_data.get("action") == "get_risk_heatmap":
                return await self._get_risk_heatmap(request_data)
            else:
                return json.dumps({
                    "error": f"Unknown action: {request_data.get('action')}"
                })
                
        except Exception as e:
            log.error(f"Error processing message: {e}")
            return json.dumps({"error": str(e)})
    
    async def _predict_risk(self, request_data: dict) -> str:
        """Predict risk for specific H3 cells"""
        try:
            h3_indices = request_data.get("h3_indices", [])
            hour_of_week = request_data.get("hour_of_week")
            
            if not h3_indices:
                return json.dumps({"error": "Missing h3_indices field"})
            
            risk_scores = []
            
            for h3_idx in h3_indices:
                # Mock feature extraction
                features = self._extract_features(h3_idx, hour_of_week)
                
                # Predict risk
                risk_proba = self.model.predict_proba([features])[0][1]  # Probability of risk
                risk_score = float(risk_proba)
                
                # Assign tier
                tier = self._assign_tier(risk_score)
                
                # Generate reasons
                reasons = self._generate_reasons(features)
                
                risk_scores.append(RiskScore(
                    h3_index=h3_idx,
                    score=risk_score,
                    tier=tier,
                    reasons=reasons,
                    features=dict(zip(self.feature_columns, features)),
                    window_start=datetime.now(timezone.utc).isoformat(),
                    window_end=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
                ))
            
            response = RiskResponse(
                risk_scores=risk_scores,
                model_version="mock-v1.0",
                processing_time_ms=100.0
            )
            
            return json.dumps(response.dict())
            
        except Exception as e:
            log.error(f"Risk prediction error: {e}")
            return json.dumps({"error": str(e)})
    
    async def _get_risk_heatmap(self, request_data: dict) -> str:
        """Get risk heatmap for an area"""
        try:
            # Return risk for all mock cells
            return await self._predict_risk({
                "h3_indices": self.mock_h3_cells,
                "hour_of_week": request_data.get("hour_of_week")
            })
            
        except Exception as e:
            log.error(f"Heatmap generation error: {e}")
            return json.dumps({"error": str(e)})
    
    def _extract_features(self, h3_idx: str, hour_of_week: Optional[int]) -> List[float]:
        """Extract features for a given H3 cell"""
        # Mock features - in production, extract from LA Open Data
        features = [
            np.random.poisson(2.0),  # crime_90d
            np.random.poisson(5.0),  # collision_365d
            np.random.poisson(1.5),  # streetlight_30d
            np.random.poisson(3.0),  # graffiti_30d
            np.random.poisson(2.5),  # dumping_30d
        ]
        
        # Add time features
        if hour_of_week is not None:
            features.append(float(hour_of_week))
            features.append(1.0 if hour_of_week >= 120 else 0.0)  # weekend
        else:
            features.extend([float(datetime.now().hour + datetime.now().weekday() * 24), 0.0])
        
        return features
    
    def _assign_tier(self, score: float) -> str:
        """Assign risk tier based on score"""
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "high"
        elif score >= 0.35:
            return "med"
        else:
            return "low"
    
    def _generate_reasons(self, features: List[float]) -> List[str]:
        """Generate human-readable reasons for risk score"""
        reasons = []
        
        if features[0] >= 3:  # crime_90d
            reasons.append(f"{int(features[0])} crime incidents last 90 days")
        if features[1] >= 5:  # collision_365d
            reasons.append(f"Collision hotspot ({int(features[1])} collisions/year)")
        if features[2] >= 1:  # streetlight_30d
            reasons.append(f"{int(features[2])} streetlight outages nearby")
        if features[3] >= 1:  # graffiti_30d
            reasons.append("Graffiti removal requests nearby")
        if features[4] >= 3:  # dumping_30d
            reasons.append("Elevated illegal dumping reports")
            
        if not reasons:
            reasons.append("baseline neighborhood risk")
            
        return reasons

# FastAPI App
app = FastAPI(
    title="Risk Prediction Agent",
    description=AGENT_DESCRIPTION,
    version=AGENT_VERSION,
)

risk_agent = RiskPredictionAgent()

@app.on_event("startup")
async def startup():
    await risk_agent.initialize()

@app.post("/predict")
async def predict_risk(request: RiskRequest) -> RiskResponse:
    """Direct API endpoint for risk prediction"""
    result = await risk_agent._predict_risk(request.dict())
    result_data = json.loads(result)
    
    if "error" in result_data:
        raise Exception(result_data["error"])
    
    return RiskResponse(**result_data)

@app.get("/heatmap")
async def get_risk_heatmap(hour_of_week: Optional[int] = None):
    """Get risk heatmap for all cells"""
    result = await risk_agent._get_risk_heatmap({"hour_of_week": hour_of_week})
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
        "endpoints": ["/predict", "/heatmap", "/health", "/agentverse/chat"]
    }

# Agentverse Chat Protocol endpoint
@app.post("/agentverse/chat")
async def agentverse_chat(message: dict):
    """Agentverse Chat Protocol endpoint"""
    response = await risk_agent.process_message(json.dumps(message))
    return {"response": response}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True
    )
