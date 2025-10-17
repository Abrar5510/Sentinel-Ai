from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Signals(BaseModel):
    tvl: float
    tvlChange24h: float
    whaleActivity: float
    liquidationRisk: float
    priceVolatility: float
    socialSentiment: float
    codeActivity: float

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/predict")
def predict(signals: Signals):
    score = (
        (min(signals.tvl / 1e9, 1) * 100) * 0.2 +
        (50 + signals.tvlChange24h * 2) * 0.25 +
        (100 - signals.whaleActivity) * 0.15 +
        (100 - signals.liquidationRisk) * 0.2 +
        (100 - signals.priceVolatility * 2) * 0.1 +
        signals.socialSentiment * 0.05 +
        signals.codeActivity * 0.05
    )
    
    health_score = max(0, min(100, int(score)))
    
    trend = "stable"
    if signals.tvlChange24h > 3:
        trend = "up"
    elif signals.tvlChange24h < -3:
        trend = "down"
    
    risk_factors = []
    if signals.tvlChange24h < -5:
        risk_factors.append(f"TVL declining {abs(signals.tvlChange24h):.1f}%")
    
    return {
        "healthScore": health_score,
        "confidence": 85,
        "trend": trend,
        "riskFactors": risk_factors
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)