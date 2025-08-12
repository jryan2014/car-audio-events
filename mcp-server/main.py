"""
FastAPI MCP Server for Car Audio Events Platform
Exposes API endpoints as MCP tools for AI agents
"""

import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi_mcp import FastApiMCP
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Car Audio Events MCP API",
    description="MCP Server for Car Audio Events Platform - AI Agent Integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> bool:
    """Verify the bearer token for API access"""
    token = credentials.credentials
    # In production, validate against your auth system
    # For now, check against environment variable
    expected_token = os.getenv("MCP_API_TOKEN", "car-audio-events-mcp-token")
    if token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return True

# =====================
# Pydantic Models
# =====================

class EventCreate(BaseModel):
    """Model for creating a new event"""
    name: str = Field(..., description="Event name")
    event_type: str = Field(..., description="Type of event (SPL, SQ, Show)")
    start_date: str = Field(..., description="Event start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="Event end date (YYYY-MM-DD)")
    location: str = Field(..., description="Event location")
    venue_name: str = Field(..., description="Venue name")
    max_competitors: int = Field(100, description="Maximum number of competitors")
    early_bird_price: float = Field(..., description="Early bird registration price")
    regular_price: float = Field(..., description="Regular registration price")
    description: Optional[str] = Field(None, description="Event description")

class CompetitorRegistration(BaseModel):
    """Model for registering a competitor"""
    event_id: str = Field(..., description="Event ID")
    competitor_name: str = Field(..., description="Competitor full name")
    email: str = Field(..., description="Competitor email")
    phone: str = Field(..., description="Phone number")
    vehicle_info: Dict[str, Any] = Field(..., description="Vehicle information")
    class_id: str = Field(..., description="Competition class ID")
    team_name: Optional[str] = Field(None, description="Team name if applicable")

class EventAnalytics(BaseModel):
    """Model for event analytics request"""
    event_id: Optional[str] = Field(None, description="Specific event ID or None for all")
    start_date: Optional[str] = Field(None, description="Analytics start date")
    end_date: Optional[str] = Field(None, description="Analytics end date")
    metrics: List[str] = Field(
        default=["registrations", "revenue", "attendance"],
        description="Metrics to retrieve"
    )

class PaymentProcess(BaseModel):
    """Model for processing payments"""
    registration_id: str = Field(..., description="Registration ID")
    amount: float = Field(..., description="Payment amount")
    currency: str = Field("USD", description="Currency code")
    payment_method: str = Field(..., description="Payment method (stripe/paypal)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class SupportTicket(BaseModel):
    """Model for support ticket creation"""
    subject: str = Field(..., description="Ticket subject")
    description: str = Field(..., description="Issue description")
    priority: str = Field("medium", description="Priority level (low/medium/high/urgent)")
    category: str = Field(..., description="Ticket category")
    user_email: str = Field(..., description="User email address")
    attachments: Optional[List[str]] = Field(None, description="Attachment URLs")

# =====================
# API Endpoints
# =====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Car Audio Events MCP Server",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "events": "/api/events",
            "registrations": "/api/registrations",
            "analytics": "/api/analytics",
            "payments": "/api/payments",
            "support": "/api/support"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Car Audio Events MCP Server"
    }

# Event Management Endpoints
@app.post("/api/events", tags=["Events"])
async def create_event(
    event: EventCreate,
    authenticated: bool = Depends(verify_token)
):
    """
    Create a new car audio competition event.
    This endpoint allows authorized users to create new events with all necessary details.
    """
    try:
        # In production, this would interact with your Supabase database
        logger.info(f"Creating event: {event.name}")
        
        # Simulate event creation
        created_event = {
            "id": f"evt_{datetime.now().timestamp()}",
            "name": event.name,
            "type": event.event_type,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "location": event.location,
            "venue": event.venue_name,
            "status": "draft",
            "created_at": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "message": f"Event '{event.name}' created successfully",
            "event": created_event
        }
    except Exception as e:
        logger.error(f"Error creating event: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/events", tags=["Events"])
async def list_events(
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 10
):
    """
    List all events with optional filtering.
    Returns a list of car audio competition events.
    """
    try:
        # Simulate fetching events
        events = [
            {
                "id": "evt_001",
                "name": "Summer Bass Championship 2025",
                "type": "SPL",
                "start_date": "2025-06-15",
                "location": "Miami, FL",
                "status": "published",
                "registrations": 45
            },
            {
                "id": "evt_002",
                "name": "SQ Masters Series",
                "type": "SQ",
                "start_date": "2025-07-20",
                "location": "Atlanta, GA",
                "status": "published",
                "registrations": 32
            }
        ]
        
        # Apply filters
        if status:
            events = [e for e in events if e["status"] == status]
        if event_type:
            events = [e for e in events if e["type"] == event_type]
        
        return {
            "success": True,
            "count": len(events),
            "events": events[:limit]
        }
    except Exception as e:
        logger.error(f"Error listing events: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Registration Endpoints
@app.post("/api/registrations", tags=["Registrations"])
async def register_competitor(
    registration: CompetitorRegistration,
    authenticated: bool = Depends(verify_token)
):
    """
    Register a competitor for an event.
    Handles competitor registration with vehicle and class information.
    """
    try:
        logger.info(f"Registering {registration.competitor_name} for event {registration.event_id}")
        
        # Simulate registration
        created_registration = {
            "id": f"reg_{datetime.now().timestamp()}",
            "event_id": registration.event_id,
            "competitor": registration.competitor_name,
            "email": registration.email,
            "class": registration.class_id,
            "status": "pending_payment",
            "created_at": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "message": "Registration created successfully",
            "registration": created_registration
        }
    except Exception as e:
        logger.error(f"Error creating registration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Analytics Endpoints
@app.post("/api/analytics", tags=["Analytics"])
async def get_analytics(
    request: EventAnalytics,
    authenticated: bool = Depends(verify_token)
):
    """
    Get analytics for events.
    Provides detailed analytics and metrics for events.
    """
    try:
        logger.info(f"Fetching analytics for metrics: {request.metrics}")
        
        # Simulate analytics data
        analytics_data = {
            "period": {
                "start": request.start_date or "2025-01-01",
                "end": request.end_date or datetime.now().strftime("%Y-%m-%d")
            },
            "metrics": {}
        }
        
        if "registrations" in request.metrics:
            analytics_data["metrics"]["registrations"] = {
                "total": 156,
                "growth": "+12%",
                "by_class": {
                    "SPL": 89,
                    "SQ": 45,
                    "Show": 22
                }
            }
        
        if "revenue" in request.metrics:
            analytics_data["metrics"]["revenue"] = {
                "total": 15600.00,
                "average_per_event": 3120.00,
                "by_payment_method": {
                    "stripe": 12000.00,
                    "paypal": 3600.00
                }
            }
        
        if "attendance" in request.metrics:
            analytics_data["metrics"]["attendance"] = {
                "total_attendees": 450,
                "average_per_event": 90,
                "retention_rate": "78%"
            }
        
        return {
            "success": True,
            "analytics": analytics_data
        }
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Payment Endpoints
@app.post("/api/payments", tags=["Payments"])
async def process_payment(
    payment: PaymentProcess,
    authenticated: bool = Depends(verify_token)
):
    """
    Process a payment for registration.
    Handles payment processing through Stripe or PayPal.
    """
    try:
        logger.info(f"Processing payment of {payment.amount} {payment.currency} via {payment.payment_method}")
        
        # Simulate payment processing
        payment_result = {
            "id": f"pay_{datetime.now().timestamp()}",
            "registration_id": payment.registration_id,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": "succeeded",
            "payment_method": payment.payment_method,
            "processed_at": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "message": "Payment processed successfully",
            "payment": payment_result
        }
    except Exception as e:
        logger.error(f"Error processing payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Support Endpoints
@app.post("/api/support", tags=["Support"])
async def create_support_ticket(
    ticket: SupportTicket,
    authenticated: bool = Depends(verify_token)
):
    """
    Create a support ticket.
    Handles support ticket creation for user issues.
    """
    try:
        logger.info(f"Creating support ticket: {ticket.subject}")
        
        # Simulate ticket creation
        created_ticket = {
            "id": f"tkt_{datetime.now().timestamp()}",
            "subject": ticket.subject,
            "description": ticket.description,
            "priority": ticket.priority,
            "category": ticket.category,
            "status": "open",
            "created_by": ticket.user_email,
            "created_at": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "message": "Support ticket created successfully",
            "ticket": created_ticket
        }
    except Exception as e:
        logger.error(f"Error creating support ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================
# Initialize MCP Server
# =====================

# Create MCP server instance
mcp = FastApiMCP(app)

# Mount the MCP server to the FastAPI app
mcp.mount()

logger.info("MCP Server mounted successfully at /mcp")

# =====================
# Main Entry Point
# =====================

if __name__ == "__main__":
    port = int(os.getenv("MCP_PORT", "8000"))
    host = os.getenv("MCP_HOST", "0.0.0.0")
    
    logger.info(f"Starting Car Audio Events MCP Server on {host}:{port}")
    logger.info(f"MCP endpoint available at http://{host}:{port}/mcp")
    logger.info(f"API documentation available at http://{host}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )