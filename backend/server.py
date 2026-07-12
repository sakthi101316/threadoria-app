from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Request, Query
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Union
import uuid
from datetime import datetime, date, timedelta
import base64
from bson import ObjectId
import httpx
import asyncio
import anthropic
import urllib.parse
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with optimized settings
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=10,
    minPoolSize=5,
    maxIdleTimeMS=30000,
    connectTimeoutMS=5000,
    serverSelectionTimeoutMS=5000,
    retryWrites=True,
    retryReads=True
)
db = client[os.environ.get('DB_NAME', 'boutiquefit')]

# MAAHIS Live Dashboard Configuration
AGENT_BASE_URL = os.environ.get('AGENT_URL', 'https://maahis-middleware-production.up.railway.app')
WEBHOOK_VERIFY_TOKEN = 'maahis_webhook_2024'

# Create FastAPI app
app = FastAPI(title="MAAHIS Boutique API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error: {request.url} - {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# Warm up database on startup
@app.on_event("startup")
async def startup_db_warmup():
    try:
        logger.info("Warming up MongoDB connection...")
        await client.admin.command('ping')
        await db.users.find_one()
        logger.info("MongoDB connection ready")
    except Exception as e:
        logger.error(f"MongoDB warmup failed: {e}")

# ========================== WEBHOOK FUNCTIONS ==========================

async def send_webhook(webhook_type: str, payload: dict):
    """Universal webhook sender with proper logging"""
    endpoints = {
        "order_create": f"{AGENT_BASE_URL}/webhook/orders",
        "order_update": f"{AGENT_BASE_URL}/webhook/order-update",
        "order_delete": f"{AGENT_BASE_URL}/webhook/order-delete",
        "status_update": f"{AGENT_BASE_URL}/api/status-update"
    }
    
    webhook_url = endpoints.get(webhook_type)
    if not webhook_url:
        logger.error(f"Unknown webhook type: {webhook_type}")
        return None
    
    try:
        logger.info(f"WEBHOOK [{webhook_type}] to {webhook_url}")
        logger.info(f"PAYLOAD: {payload}")
        
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                webhook_url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Verify-Token": WEBHOOK_VERIFY_TOKEN,
                    "User-Agent": "MAAHIS-App/2.0"
                }
            )
            logger.info(f"WEBHOOK RESPONSE: {response.status_code} - {response.text[:200]}")
            return {"success": response.status_code == 200, "status": response.status_code, "response": response.text}
    except Exception as e:
        logger.error(f"WEBHOOK ERROR [{webhook_type}]: {e}")
        return {"success": False, "error": str(e)}

async def notify_dashboard_order_created(order_number: str, customer_name: str, customer_phone: str, order_type: str, amount: float, advance_paid: float, delivery_date: str, notes: str = ""):
    """Notify dashboard when a NEW order is created"""
    phone = customer_phone.replace("+", "").replace(" ", "") if customer_phone else ""
    if phone and not phone.startswith("91"):
        phone = "91" + phone
    
    payload = {
        "type": "new_order",
        "order_number": order_number,
        "customer_name": customer_name,
        "customer_phone": phone,
        "item": order_type,
        "amount": int(amount) if amount else 0,
        "advance_paid": int(advance_paid) if advance_paid else 0,
        "delivery_date": delivery_date,
        "notes": ""
    }
    return await send_webhook("order_create", payload)

async def notify_dashboard_order_updated(order_number: str, amount: float, advance_paid: float, status: str, customer_name: str = "", customer_phone: str = "", order_type: str = ""):
    """Notify dashboard when order/payment is UPDATED"""
    phone = customer_phone.replace("+", "").replace(" ", "") if customer_phone else ""
    if phone and not phone.startswith("91"):
        phone = "91" + phone
    
    payload = {
        "order_number": order_number,
        "amount": int(amount) if amount else 0,
        "advance_paid": int(advance_paid) if advance_paid else 0,
        "status": status,
        "customer_name": customer_name,
        "customer_phone": phone,
        "item": order_type
    }
    return await send_webhook("order_update", payload)

async def notify_dashboard_order_deleted(order_number: str, customer_name: str):
    """Notify dashboard when order is DELETED"""
    payload = {
        "order_number": order_number,
        "customer_name": customer_name,
        "action": "deleted"
    }
    return await send_webhook("order_delete", payload)

async def notify_dashboard_status_changed(order_number: str, new_status: str, customer_name: str, customer_phone: str):
    """Notify dashboard when order STATUS changes"""
    phone = customer_phone.replace("+", "").replace(" ", "") if customer_phone else ""
    if phone and not phone.startswith("91"):
        phone = "91" + phone
    
    payload = {
        "order_number": order_number,
        "status": new_status,
        "customer_name": customer_name,
        "phone": phone
    }
    return await send_webhook("status_update", payload)

# ========================== PYDANTIC MODELS ==========================

class UserLogin(BaseModel):
    email: str
    pin: str

class UserRegister(BaseModel):
    boutique_name: str
    owner_name: str
    email: str
    phone: str
    pin: str
    otp: str

class SendSMSOTPRequest(BaseModel):
    phone: str

class UserResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    boutique_name: Optional[str] = None

class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    photo: Optional[str] = ""
    notes: Optional[str] = ""
    user_id: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    photo: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    name: str
    phone: str
    address: str
    photo: str
    notes: str
    created_at: datetime

class TopMeasurements(BaseModel):
    full_length: Optional[Union[float, str]] = 0
    shoulder: Optional[Union[float, str]] = 0
    upper_chest: Optional[Union[float, str]] = 0
    bust: Optional[Union[float, str]] = 0
    waist: Optional[Union[float, str]] = 0
    front_deep: Optional[Union[float, str]] = 0
    back_deep: Optional[Union[float, str]] = 0
    sleeve_length: Optional[Union[float, str]] = 0
    sleeve_round: Optional[Union[float, str]] = 0
    arm_hole: Optional[Union[float, str]] = 0
    biceps: Optional[Union[float, str]] = 0
    dot_point: Optional[Union[float, str]] = 0
    dot_to_dot: Optional[Union[float, str]] = 0
    slit_length: Optional[Union[float, str]] = 0
    seat_round: Optional[Union[float, str]] = 0

class BottomMeasurements(BaseModel):
    length: Optional[Union[float, str]] = 0
    hip_round: Optional[Union[float, str]] = 0
    thighs: Optional[Union[float, str]] = 0
    knees: Optional[Union[float, str]] = 0
    ankle: Optional[Union[float, str]] = 0

class MeasurementCreate(BaseModel):
    customer_id: str
    category: str
    top_measurements: Optional[TopMeasurements] = None
    bottom_measurements: Optional[BottomMeasurements] = None
    reference_photos: Optional[List[str]] = []
    added_by_voice: Optional[bool] = False

class MeasurementUpdate(BaseModel):
    category: Optional[str] = None
    top_measurements: Optional[TopMeasurements] = None
    bottom_measurements: Optional[BottomMeasurements] = None
    reference_photos: Optional[List[str]] = None
    added_by_voice: Optional[bool] = None

class MeasurementResponse(BaseModel):
    id: str
    customer_id: str
    category: str
    top_measurements: Optional[dict] = None
    bottom_measurements: Optional[dict] = None
    reference_photos: List[str]
    measurement_date: datetime
    added_by_voice: bool

class OrderCreate(BaseModel):
    customer_id: str
    measurement_id: Optional[str] = None
    order_type: str
    description: Optional[str] = ""
    material_photos: Optional[List[str]] = []
    order_date: str
    delivery_date: str
    voice_instructions: Optional[str] = ""
    auto_created_by_voice: Optional[bool] = False
    amount: Optional[float] = 0
    advance_paid: Optional[float] = 0
    user_id: Optional[str] = None

class OrderUpdate(BaseModel):
    measurement_id: Optional[str] = None
    order_type: Optional[str] = None
    description: Optional[str] = None
    material_photos: Optional[List[str]] = None
    delivery_date: Optional[str] = None
    status: Optional[str] = None
    voice_instructions: Optional[str] = None
    amount: Optional[float] = None
    advance_paid: Optional[float] = None

class OrderResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    measurement_id: Optional[str] = None
    order_type: str
    description: str
    material_photos: List[str]
    order_date: datetime
    delivery_date: datetime
    status: str
    voice_instructions: str
    auto_created_by_voice: bool
    created_at: datetime
    order_number: Optional[str] = None
    tracking_link: Optional[str] = None
    amount: Optional[float] = 0
    advance_paid: Optional[float] = 0

class PaymentCreate(BaseModel):
    order_id: str
    final_amount: float
    advance_paid: float

class PaymentUpdate(BaseModel):
    final_amount: Optional[float] = None
    advance_paid: Optional[float] = None
    payment_status: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    order_id: str
    final_amount: float
    advance_paid: float
    balance_amount: float
    payment_status: str
    last_updated: datetime

class DashboardStats(BaseModel):
    total_customers: int
    pending_orders: int
    delivery_today: int
    delivery_in_2_days: int

class SearchResult(BaseModel):
    type: str
    id: str
    title: str
    subtitle: str
    extra: Optional[str] = None

class VoiceTranscriptionRequest(BaseModel):
    audio_base64: str
    format: str = "wav"

class VoiceTranscriptionResponse(BaseModel):
    text: str
    success: bool

# ========================== HELPER FUNCTIONS ==========================

def serialize_doc(doc):
    if doc is None:
        return None
    doc['id'] = str(doc.pop('_id'))
    return doc

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def send_sms_otp(phone: str, otp: str) -> bool:
    try:
        from twilio.rest import Client as TwilioClient
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
        
        if not all([account_sid, auth_token, twilio_phone]):
            return False
        
        client = TwilioClient(account_sid, auth_token)
        message = client.messages.create(
            body=f"Your MAAHIS verification code is: {otp}. Valid for 5 minutes.",
            from_=twilio_phone,
            to=phone
        )
        logger.info(f"SMS sent: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Twilio error: {e}")
        return False

otp_storage = {}
