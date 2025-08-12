"""
Supabase Service for MCP Server
Handles all database interactions with Supabase
"""

import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseService:
    """Service class for Supabase database operations"""
    
    def __init__(self):
        """Initialize Supabase client"""
        supabase_url = os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for server
        
        if not supabase_url or not supabase_key:
            logger.warning("Supabase credentials not found. Running in mock mode.")
            self.client = None
        else:
            self.client: Client = create_client(supabase_url, supabase_key)
            logger.info("Supabase client initialized successfully")
    
    # =====================
    # Event Operations
    # =====================
    
    async def create_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new event in the database"""
        if not self.client:
            return self._mock_event_response(event_data)
        
        try:
            response = self.client.table('events').insert(event_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating event: {str(e)}")
            raise
    
    async def get_events(
        self,
        status: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Fetch events from database with filters"""
        if not self.client:
            return self._mock_events_list()
        
        try:
            query = self.client.table('events').select('*')
            
            if status:
                query = query.eq('status', status)
            if event_type:
                query = query.eq('event_type', event_type)
            
            query = query.limit(limit)
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching events: {str(e)}")
            raise
    
    async def get_event_by_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific event by ID"""
        if not self.client:
            return self._mock_event_by_id(event_id)
        
        try:
            response = self.client.table('events').select('*').eq('id', event_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching event {event_id}: {str(e)}")
            raise
    
    # =====================
    # Registration Operations
    # =====================
    
    async def create_registration(self, registration_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new registration"""
        if not self.client:
            return self._mock_registration_response(registration_data)
        
        try:
            response = self.client.table('registrations').insert(registration_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating registration: {str(e)}")
            raise
    
    async def get_registrations(
        self,
        event_id: Optional[str] = None,
        user_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch registrations with filters"""
        if not self.client:
            return self._mock_registrations_list()
        
        try:
            query = self.client.table('registrations').select('*')
            
            if event_id:
                query = query.eq('event_id', event_id)
            if user_id:
                query = query.eq('user_id', user_id)
            if status:
                query = query.eq('status', status)
            
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching registrations: {str(e)}")
            raise
    
    # =====================
    # Analytics Operations
    # =====================
    
    async def get_event_analytics(
        self,
        event_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get analytics data for events"""
        if not self.client:
            return self._mock_analytics_data()
        
        try:
            # This would typically involve complex queries or calling stored procedures
            # For now, we'll do basic aggregations
            
            analytics = {
                "registrations": await self._get_registration_stats(event_id, start_date, end_date),
                "revenue": await self._get_revenue_stats(event_id, start_date, end_date),
                "attendance": await self._get_attendance_stats(event_id, start_date, end_date)
            }
            
            return analytics
        except Exception as e:
            logger.error(f"Error fetching analytics: {str(e)}")
            raise
    
    async def _get_registration_stats(
        self,
        event_id: Optional[str],
        start_date: Optional[str],
        end_date: Optional[str]
    ) -> Dict[str, Any]:
        """Get registration statistics"""
        try:
            query = self.client.table('registrations').select('*', count='exact')
            
            if event_id:
                query = query.eq('event_id', event_id)
            if start_date:
                query = query.gte('created_at', start_date)
            if end_date:
                query = query.lte('created_at', end_date)
            
            response = query.execute()
            
            return {
                "total": response.count if hasattr(response, 'count') else len(response.data),
                "data": response.data
            }
        except Exception as e:
            logger.error(f"Error getting registration stats: {str(e)}")
            return {"total": 0, "data": []}
    
    async def _get_revenue_stats(
        self,
        event_id: Optional[str],
        start_date: Optional[str],
        end_date: Optional[str]
    ) -> Dict[str, Any]:
        """Get revenue statistics"""
        try:
            query = self.client.table('payments').select('amount, status, payment_method')
            
            if event_id:
                # Join with registrations to filter by event
                query = query.eq('registration.event_id', event_id)
            if start_date:
                query = query.gte('created_at', start_date)
            if end_date:
                query = query.lte('created_at', end_date)
            
            query = query.eq('status', 'succeeded')
            response = query.execute()
            
            total_revenue = sum(p['amount'] for p in response.data) if response.data else 0
            
            return {
                "total": total_revenue,
                "transaction_count": len(response.data) if response.data else 0,
                "data": response.data
            }
        except Exception as e:
            logger.error(f"Error getting revenue stats: {str(e)}")
            return {"total": 0, "transaction_count": 0, "data": []}
    
    async def _get_attendance_stats(
        self,
        event_id: Optional[str],
        start_date: Optional[str],
        end_date: Optional[str]
    ) -> Dict[str, Any]:
        """Get attendance statistics"""
        try:
            query = self.client.table('event_check_ins').select('*', count='exact')
            
            if event_id:
                query = query.eq('event_id', event_id)
            if start_date:
                query = query.gte('checked_in_at', start_date)
            if end_date:
                query = query.lte('checked_in_at', end_date)
            
            response = query.execute()
            
            return {
                "total_checked_in": response.count if hasattr(response, 'count') else len(response.data),
                "data": response.data
            }
        except Exception as e:
            logger.error(f"Error getting attendance stats: {str(e)}")
            return {"total_checked_in": 0, "data": []}
    
    # =====================
    # Payment Operations
    # =====================
    
    async def create_payment_record(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a payment record"""
        if not self.client:
            return self._mock_payment_response(payment_data)
        
        try:
            response = self.client.table('payments').insert(payment_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating payment record: {str(e)}")
            raise
    
    # =====================
    # Support Operations
    # =====================
    
    async def create_support_ticket(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a support ticket"""
        if not self.client:
            return self._mock_ticket_response(ticket_data)
        
        try:
            response = self.client.table('support_tickets').insert(ticket_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating support ticket: {str(e)}")
            raise
    
    # =====================
    # Mock Responses
    # =====================
    
    def _mock_event_response(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return mock event response"""
        return {
            "id": f"evt_mock_{datetime.now().timestamp()}",
            **event_data,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    
    def _mock_events_list(self) -> List[Dict[str, Any]]:
        """Return mock events list"""
        return [
            {
                "id": "evt_001",
                "name": "Mock Bass Championship",
                "event_type": "SPL",
                "start_date": "2025-06-15",
                "location": "Miami, FL",
                "status": "published"
            },
            {
                "id": "evt_002",
                "name": "Mock SQ Masters",
                "event_type": "SQ",
                "start_date": "2025-07-20",
                "location": "Atlanta, GA",
                "status": "published"
            }
        ]
    
    def _mock_event_by_id(self, event_id: str) -> Dict[str, Any]:
        """Return mock event by ID"""
        return {
            "id": event_id,
            "name": "Mock Event",
            "event_type": "SPL",
            "start_date": "2025-06-15",
            "location": "Mock City, ST",
            "status": "published"
        }
    
    def _mock_registration_response(self, registration_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return mock registration response"""
        return {
            "id": f"reg_mock_{datetime.now().timestamp()}",
            **registration_data,
            "status": "pending_payment",
            "created_at": datetime.now().isoformat()
        }
    
    def _mock_registrations_list(self) -> List[Dict[str, Any]]:
        """Return mock registrations list"""
        return [
            {
                "id": "reg_001",
                "event_id": "evt_001",
                "competitor_name": "John Doe",
                "status": "confirmed"
            }
        ]
    
    def _mock_analytics_data(self) -> Dict[str, Any]:
        """Return mock analytics data"""
        return {
            "registrations": {"total": 156, "data": []},
            "revenue": {"total": 15600.00, "transaction_count": 156, "data": []},
            "attendance": {"total_checked_in": 145, "data": []}
        }
    
    def _mock_payment_response(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return mock payment response"""
        return {
            "id": f"pay_mock_{datetime.now().timestamp()}",
            **payment_data,
            "status": "succeeded",
            "processed_at": datetime.now().isoformat()
        }
    
    def _mock_ticket_response(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return mock ticket response"""
        return {
            "id": f"tkt_mock_{datetime.now().timestamp()}",
            **ticket_data,
            "status": "open",
            "created_at": datetime.now().isoformat()
        }

# Create a singleton instance
supabase_service = SupabaseService()