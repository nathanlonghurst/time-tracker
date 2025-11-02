from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import database

app = FastAPI(title="Time Tracker API")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

class TimeEntry(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    hours: float

class SaveEntriesRequest(BaseModel):
    date: str
    entries: List[TimeEntry]

class SaveJournalRequest(BaseModel):
    date: str
    content: str

@app.on_event("startup")
async def startup_event():
    """Initialize database and seed sample data on startup."""
    database.init_db()
    database.seed_sample_data()

@app.get("/")
async def root():
    """Serve the main HTML page."""
    return FileResponse("static/index.html")

@app.get("/api/entries/{date}")
async def get_entries(date: str):
    """Get all time entries for a specific date."""
    entries = database.get_entries_by_date(date)
    return entries

@app.post("/api/entries")
async def save_entries(request: SaveEntriesRequest):
    """Save time entries for a specific date."""
    entries_dict = [entry.dict() for entry in request.entries]
    success = database.save_entries_for_date(request.date, entries_dict)

    if success:
        return {"status": "success", "message": "Entries saved successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save entries")

@app.get("/api/entries/month/{year}/{month}")
async def get_month_summary(year: int, month: int):
    """Get summary of hours for each day in a month."""
    summary = database.get_month_summary(year, month)
    return summary

@app.get("/api/journal/{date}")
async def get_journal(date: str):
    """Get journal entry for a specific date."""
    content = database.get_journal_entry(date)
    return {"content": content if content else ""}

@app.post("/api/journal")
async def save_journal(request: SaveJournalRequest):
    """Save journal entry for a specific date."""
    success = database.save_journal_entry(request.date, request.content)

    if success:
        return {"status": "success", "message": "Journal saved successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save journal entry")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
