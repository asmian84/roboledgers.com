from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from duckduckgo_search import DDGS
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "DuckDuckGo Search Server is Running 🦆"}

@app.get("/search")
def search(q: str):
    if not q:
        raise HTTPException(status_code=400, detail="Query found")
    
    logger.info(f"🔍 Searching for: {q}")
    
    try:
        # Use DuckDuckGo Search
        # max_results=1 because we only need the top hit for vendor enrichment
        results = DDGS().text(q, max_results=1)
        
        if results:
            return {
                "success": True, 
                "result": results[0]  # Return top result {title, href, body}
            }
        else:
            return {"success": False, "message": "No results found"}
            
    except Exception as e:
        logger.error(f"❌ Search failed: {str(e)}")
        # Don't crash the specific request, just return error
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    print("🚀 Starting Search Server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
