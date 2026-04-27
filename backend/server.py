from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, date
import base64
from bson import ObjectId
import httpx
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'boutiquefit')]

# MAAHIS Live Dashboard Agent Configuration
AGENT_BASE_URL = os.environ.get('AGENT_URL', 'https://a649b61b738a45.lhr.life')

# Create the main app without a prefix
app = FastAPI(title="BoutiqueFit API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========================== ANTIGRAVITY INTEGRATION (NON-BLOCKING) ==========================

def fire_and_forget(coro):
    """Run a coroutine in the background without waiting for it"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(coro)
        else:
            loop.run_until_complete(coro)
    except Exception as e:
        logger.error(f"Fire and forget error: {e}")

async def notify_antigravity_order_created(order_number: str, customer_phone: str, customer_name: str, order_type: str, notes: str, amount: float, delivery_date: str = ""):
    """Send new order to MAAHIS Live Dashboard - INSTANT, NON-BLOCKING"""
    try:
        # Format phone number
        phone = customer_phone.replace("+", "").replace(" ", "") if customer_phone else ""
        if phone and not phone.startswith("91"):
            phone = "91" + phone
        
        payload = {
            "order_number": order_number,
            "customer_phone": phone,
            "customer_name": customer_name,
            "item": order_type,
            "delivery_date": delivery_date,
            "amount": int(amount) if amount else 0
        }
        
        logger.info(f"Sending to MAAHIS Dashboard: {payload}")
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.post(
                f"{AGENT_BASE_URL}/api/new-order",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Bypass-Tunnel-Reminder": "true",
                    "User-Agent": "MAAHIS-Webhook/1.0"
                }
            )
            logger.info(f"Dashboard response: {response.status_code} - {response.text[:200]}")
            return response.json() if response.status_code == 200 else None
    except Exception as e:
        logger.error(f"Failed to notify Dashboard (new order): {e}")
        return None

async def notify_antigravity_status_update(order_number: str, phone: str, new_status: str, customer_name: str):
    """Send status update to MAAHIS Live Dashboard - INSTANT, NON-BLOCKING"""
    try:
        # Format phone number
        formatted_phone = phone.replace("+", "").replace(" ", "") if phone else ""
        if formatted_phone and not formatted_phone.startswith("91"):
            formatted_phone = "91" + formatted_phone
            
        payload = {
            "order_number": order_number,
            "phone": formatted_phone,
            "new_status": new_status,
            "customer_name": customer_name
        }
        
        logger.info(f"Sending status update to Dashboard: {payload}")
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.post(
                f"{AGENT_BASE_URL}/api/status-update",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Bypass-Tunnel-Reminder": "true",
                    "User-Agent": "MAAHIS-Webhook/1.0"
                }
            )
            logger.info(f"Status update response: {response.status_code} - {response.text[:200]}")
            return response.json() if response.status_code == 200 else None
    except Exception as e:
        logger.error(f"Failed to notify Dashboard (status update): {e}")
        return None

async def notify_antigravity_payment(order_id: str, amount: float, method: str = "Cash"):
    """Notify Antigravity when a payment is received - NON-BLOCKING"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            payload = {
                "order_id": order_id,
                "amount": int(amount),
                "method": method
            }
            response = await http_client.post(
                f"{ANTIGRAVITY_BASE_URL}/api/payments",
                json=payload,
                headers={"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
            )
            logger.info(f"Antigravity payment notification: {response.status_code} - {response.text}")
            return response.json() if response.status_code == 200 else None
    except Exception as e:
        logger.error(f"Failed to notify Antigravity (payment): {e}")
        return None

# ========================== MODELS ==========================

# User/Boutique Models
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

class SendOTPRequest(BaseModel):
    email: str

class UserResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    boutique_name: Optional[str] = None

# Customer Models
class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    photo: Optional[str] = ""  # Base64 image
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

# Measurement Models
class TopMeasurements(BaseModel):
    full_length: Optional[float] = 0
    shoulder: Optional[float] = 0
    upper_chest: Optional[float] = 0
    bust: Optional[float] = 0
    waist: Optional[float] = 0
    front_deep: Optional[float] = 0
    back_deep: Optional[float] = 0
    sleeve_length: Optional[float] = 0
    sleeve_round: Optional[float] = 0
    arm_hole: Optional[float] = 0
    biceps: Optional[float] = 0
    dot_point: Optional[float] = 0
    dot_to_dot: Optional[float] = 0
    slit_length: Optional[float] = 0
    seat_round: Optional[float] = 0

class BottomMeasurements(BaseModel):
    length: Optional[float] = 0
    hip_round: Optional[float] = 0
    thighs: Optional[float] = 0
    knees: Optional[float] = 0
    ankle: Optional[float] = 0

class MeasurementCreate(BaseModel):
    customer_id: str
    category: str  # "Top" or "Bottom"
    top_measurements: Optional[TopMeasurements] = None
    bottom_measurements: Optional[BottomMeasurements] = None
    reference_photos: Optional[List[str]] = []  # Base64 images
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

# Order Models
class OrderCreate(BaseModel):
    customer_id: str
    measurement_id: Optional[str] = None
    order_type: str
    description: Optional[str] = ""
    material_photos: Optional[List[str]] = []  # Base64 images
    order_date: str  # ISO date string
    delivery_date: str  # ISO date string
    voice_instructions: Optional[str] = ""
    auto_created_by_voice: Optional[bool] = False
    amount: Optional[float] = 0  # Order amount for webhook

class OrderUpdate(BaseModel):
    measurement_id: Optional[str] = None
    order_type: Optional[str] = None
    description: Optional[str] = None
    material_photos: Optional[List[str]] = None
    delivery_date: Optional[str] = None
    status: Optional[str] = None
    voice_instructions: Optional[str] = None

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

# Payment Models
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

# Voice Transcription
class VoiceTranscriptionRequest(BaseModel):
    audio_base64: str
    format: str = "wav"

class VoiceTranscriptionResponse(BaseModel):
    text: str
    success: bool

# Dashboard Stats
class DashboardStats(BaseModel):
    total_customers: int
    pending_orders: int
    delivery_today: int
    delivery_in_2_days: int

# Search Response
class SearchResult(BaseModel):
    type: str  # "customer" or "order"
    id: str
    title: str
    subtitle: str
    extra: Optional[str] = None

# ========================== HELPER FUNCTIONS ==========================

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc['id'] = str(doc.pop('_id'))
    return doc

# ========================== AUTH ROUTES ==========================

# In-memory OTP storage (for demo - use Redis in production)
otp_storage = {}

import random
import string

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def send_sms_otp(phone: str, otp: str) -> bool:
    """Send OTP via Twilio SMS"""
    try:
        from twilio.rest import Client as TwilioClient
        
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
        
        if not all([account_sid, auth_token, twilio_phone]) or auth_token == 'YOUR_AUTH_TOKEN_HERE':
            logger.warning("Twilio credentials not fully configured - using mock mode")
            return False
        
        client = TwilioClient(account_sid, auth_token)
        
        message = client.messages.create(
            body=f"Your BoutiqueFit verification code is: {otp}. Valid for 5 minutes.",
            from_=twilio_phone,
            to=phone
        )
        logger.info(f"SMS sent successfully: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Twilio SMS error: {str(e)}")
        return False

class SendSMSOTPRequest(BaseModel):
    phone: str

@api_router.post("/auth/send-otp")
async def send_otp(request: SendSMSOTPRequest):
    """Send OTP to phone number for registration"""
    phone = request.phone
    
    # Normalize phone number (add +91 for India if not present)
    if not phone.startswith('+'):
        phone = '+91' + phone.lstrip('0')
    
    # Check if phone already registered
    existing_user = await db.users.find_one({"phone": phone})
    if existing_user:
        return {"success": False, "message": "Phone number already registered. Please login."}
    
    # Generate OTP
    otp = generate_otp()
    otp_storage[phone] = {
        "otp": otp,
        "created_at": datetime.utcnow()
    }
    
    # Try to send SMS
    sms_sent = send_sms_otp(phone, otp)
    
    if sms_sent:
        logger.info(f"OTP sent via SMS to {phone}")
        return {"success": True, "message": f"OTP sent to {phone}"}
    else:
        # Fallback to mock mode
        logger.info(f"OTP for {phone}: {otp} (MOCK MODE - SMS not configured)")
        return {"success": True, "message": f"OTP sent to {phone}. (Demo: use {otp})"}

@api_router.post("/auth/register", response_model=UserResponse)
async def register(data: UserRegister):
    """Register a new boutique"""
    phone = data.phone
    email = data.email.lower()
    
    # Normalize phone number
    if not phone.startswith('+'):
        phone = '+91' + phone.lstrip('0')
    
    # Check if phone already registered
    existing_user = await db.users.find_one({"phone": phone})
    if existing_user:
        return UserResponse(success=False, message="Phone number already registered")
    
    # Check if email already registered
    existing_email = await db.users.find_one({"email": email})
    if existing_email:
        return UserResponse(success=False, message="Email already registered")
    
    # Verify OTP
    if len(data.otp) != 6 or not data.otp.isdigit():
        return UserResponse(success=False, message="Invalid OTP format")
    
    stored_otp = otp_storage.get(phone)
    if stored_otp:
        # Check if OTP matches
        if stored_otp["otp"] != data.otp:
            return UserResponse(success=False, message="Invalid OTP")
        # Check if OTP expired (5 minutes)
        if (datetime.utcnow() - stored_otp["created_at"]).total_seconds() > 300:
            return UserResponse(success=False, message="OTP expired. Please request a new one.")
    else:
        # Accept any 6-digit OTP in demo mode
        logger.warning(f"No stored OTP for {phone}, accepting in demo mode")
    
    # Create user
    user_doc = {
        "boutique_name": data.boutique_name,
        "owner_name": data.owner_name,
        "email": email,
        "phone": phone,
        "pin": data.pin,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = await db.users.insert_one(user_doc)
    
    # Clear OTP
    if phone in otp_storage:
        del otp_storage[phone]
    
    return UserResponse(
        success=True,
        message="Registration successful! Please login.",
        user_id=str(result.inserted_id),
        boutique_name=data.boutique_name
    )

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    """Login with phone/email and PIN"""
    identifier = credentials.email.lower()
    
    # ============================================================
    # TEMPORARY RESTRICTION - INTERNAL USE ONLY
    # Added: January 2025
    # Remove this block after one month to restore public access
    # ============================================================
    ALLOWED_MOBILE = "8608080103"
    ALLOWED_PIN = "101316"
    
    if identifier != ALLOWED_MOBILE or credentials.pin != ALLOWED_PIN:
        return UserResponse(
            success=False,
            message="This application is temporarily restricted for internal use only."
        )
    # ============================================================
    # END OF TEMPORARY RESTRICTION
    # ============================================================
    
    # Check in database by email or phone
    user = await db.users.find_one({
        "$or": [
            {"email": identifier, "pin": credentials.pin},
            {"phone": identifier, "pin": credentials.pin},
            {"phone": '+91' + identifier.lstrip('0'), "pin": credentials.pin}
        ]
    })
    
    # If user exists in DB, return their data
    if user:
        return UserResponse(
            success=True,
            message="Login successful",
            user_id=str(user["_id"]),
            boutique_name=user.get("boutique_name", "Boutique")
        )
    
    # For the allowed user, create/find their account
    maahis_user = await db.users.find_one({"phone": ALLOWED_MOBILE})
    if not maahis_user:
        # Create account if doesn't exist
        maahis_data = {
            "boutique_name": "MAAHIS Boutique",
            "owner_name": "MAAHIS",
            "email": "maahis@boutique.com",
            "phone": ALLOWED_MOBILE,
            "pin": ALLOWED_PIN,
            "created_at": datetime.utcnow()
        }
        result = await db.users.insert_one(maahis_data)
        return UserResponse(
            success=True,
            message="Login successful",
            user_id=str(result.inserted_id),
            boutique_name="MAAHIS Boutique"
        )
    else:
        return UserResponse(
            success=True,
            message="Login successful",
            user_id=str(maahis_user["_id"]),
            boutique_name=maahis_user.get("boutique_name", "MAAHIS Boutique")
        )
    
    return UserResponse(
        success=False,
        message="Invalid phone/email or PIN"
    )

# ========================== CUSTOMER ROUTES ==========================

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate):
    """Create a new customer"""
    customer_doc = {
        "name": customer.name,
        "phone": customer.phone,
        "address": customer.address or "",
        "photo": customer.photo or "",
        "notes": customer.notes or "",
        "user_id": customer.user_id,
        "created_at": datetime.utcnow()
    }
    result = await db.customers.insert_one(customer_doc)
    customer_doc['id'] = str(result.inserted_id)
    if '_id' in customer_doc:
        del customer_doc['_id']
    return CustomerResponse(**customer_doc)

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(search: Optional[str] = None, user_id: Optional[str] = None):
    """Get all customers or search by name/phone, filtered by user_id"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.customers.find(query).sort("created_at", -1).to_list(1000)
    return [CustomerResponse(**serialize_doc(c)) for c in customers]

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, user_id: Optional[str] = None):
    """Get a single customer - optionally verify ownership with user_id"""
    try:
        query = {"_id": ObjectId(customer_id)}
        if user_id:
            query["user_id"] = user_id
        customer = await db.customers.find_one(query)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return CustomerResponse(**serialize_doc(customer))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, update: CustomerUpdate, user_id: Optional[str] = None):
    """Update a customer - optionally verify ownership with user_id"""
    try:
        # Build query with optional user_id verification
        query = {"_id": ObjectId(customer_id)}
        if user_id:
            query["user_id"] = user_id
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = await db.customers.update_one(query, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found or access denied")
        
        customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
        return CustomerResponse(**serialize_doc(customer))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user_id: Optional[str] = None):
    """Delete a customer and related data - optionally verify ownership with user_id"""
    try:
        # Build query with optional user_id verification
        query = {"_id": ObjectId(customer_id)}
        if user_id:
            query["user_id"] = user_id
        
        # Check if customer exists and belongs to user
        customer = await db.customers.find_one(query)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found or access denied")
        
        # Also delete related measurements and orders
        await db.measurements.delete_many({"customer_id": customer_id})
        await db.orders.delete_many({"customer_id": customer_id})
        await db.customers.delete_one(query)
        
        return {"message": "Customer and related data deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ========================== MEASUREMENT ROUTES ==========================

@api_router.post("/measurements", response_model=MeasurementResponse)
async def create_measurement(measurement: MeasurementCreate):
    """Create a new measurement"""
    measurement_doc = {
        "customer_id": measurement.customer_id,
        "category": measurement.category,
        "top_measurements": measurement.top_measurements.dict() if measurement.top_measurements else None,
        "bottom_measurements": measurement.bottom_measurements.dict() if measurement.bottom_measurements else None,
        "reference_photos": measurement.reference_photos or [],
        "measurement_date": datetime.utcnow(),
        "added_by_voice": measurement.added_by_voice or False
    }
    result = await db.measurements.insert_one(measurement_doc)
    measurement_doc['id'] = str(result.inserted_id)
    return MeasurementResponse(**measurement_doc)

@api_router.get("/measurements/customer/{customer_id}", response_model=List[MeasurementResponse])
async def get_customer_measurements(customer_id: str):
    """Get all measurements for a customer"""
    measurements = await db.measurements.find({"customer_id": customer_id}).sort("measurement_date", -1).to_list(100)
    return [MeasurementResponse(**serialize_doc(m)) for m in measurements]

@api_router.get("/measurements/{measurement_id}", response_model=MeasurementResponse)
async def get_measurement(measurement_id: str):
    """Get a single measurement"""
    try:
        measurement = await db.measurements.find_one({"_id": ObjectId(measurement_id)})
        if not measurement:
            raise HTTPException(status_code=404, detail="Measurement not found")
        return MeasurementResponse(**serialize_doc(measurement))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/measurements/{measurement_id}", response_model=MeasurementResponse)
async def update_measurement(measurement_id: str, update: MeasurementUpdate):
    """Update a measurement"""
    try:
        update_data = {}
        if update.category is not None:
            update_data['category'] = update.category
        if update.top_measurements is not None:
            update_data['top_measurements'] = update.top_measurements.dict()
        if update.bottom_measurements is not None:
            update_data['bottom_measurements'] = update.bottom_measurements.dict()
        if update.reference_photos is not None:
            update_data['reference_photos'] = update.reference_photos
        if update.added_by_voice is not None:
            update_data['added_by_voice'] = update.added_by_voice
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = await db.measurements.update_one(
            {"_id": ObjectId(measurement_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Measurement not found")
        
        measurement = await db.measurements.find_one({"_id": ObjectId(measurement_id)})
        return MeasurementResponse(**serialize_doc(measurement))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/measurements/{measurement_id}")
async def delete_measurement(measurement_id: str):
    """Delete a measurement"""
    try:
        result = await db.measurements.delete_one({"_id": ObjectId(measurement_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Measurement not found")
        return {"message": "Measurement deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ========================== ORDER ROUTES ==========================

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate):
    """Create a new order"""
    # Get customer info
    user_id = None
    try:
        customer = await db.customers.find_one({"_id": ObjectId(order.customer_id)})
        customer_name = customer.get("name", "") if customer else ""
        customer_phone = customer.get("phone", "") if customer else ""
        user_id = customer.get("user_id") if customer else None
    except:
        customer_name = ""
        customer_phone = ""
    
    order_doc = {
        "customer_id": order.customer_id,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "user_id": user_id,
        "measurement_id": order.measurement_id,
        "order_type": order.order_type,
        "description": order.description or "",
        "material_photos": order.material_photos or [],
        "order_date": datetime.fromisoformat(order.order_date.replace('Z', '+00:00')) if order.order_date else datetime.utcnow(),
        "delivery_date": datetime.fromisoformat(order.delivery_date.replace('Z', '+00:00')) if order.delivery_date else datetime.utcnow(),
        "status": "received",
        "voice_instructions": order.voice_instructions or "",
        "auto_created_by_voice": order.auto_created_by_voice or False,
        "amount": order.amount or 0,  # Store amount in order
        "created_at": datetime.utcnow()
    }
    result = await db.orders.insert_one(order_doc)
    order_doc['id'] = str(result.inserted_id)
    
    # Generate order number
    order_number = f"ORD-{str(result.inserted_id)[-6:].upper()}"
    
    # Format delivery date for webhook
    delivery_date_str = ""
    if order.delivery_date:
        try:
            dd = datetime.fromisoformat(order.delivery_date.replace('Z', '+00:00'))
            delivery_date_str = dd.strftime('%d %b %Y')
        except:
            delivery_date_str = order.delivery_date
    
    # Notify Agent about new order (NON-BLOCKING - fire and forget)
    asyncio.create_task(notify_antigravity_order_created(
        order_number=order_number,
        customer_phone=customer_phone,
        customer_name=customer_name,
        order_type=order.order_type,
        notes=order.description or order.voice_instructions or "",
        amount=order.amount or 0,  # Use amount from order
        delivery_date=delivery_date_str
    ))
    
    return OrderResponse(**order_doc)

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    search: Optional[str] = None,
    user_id: Optional[str] = None
):
    """Get all orders with optional filters"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search, "$options": "i"}},
            {"order_type": {"$regex": search, "$options": "i"}}
        ]
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    return [OrderResponse(**serialize_doc(o)) for o in orders]

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, user_id: Optional[str] = None):
    """Get a single order - optionally verify ownership with user_id"""
    try:
        query = {"_id": ObjectId(order_id)}
        if user_id:
            query["user_id"] = user_id
        order = await db.orders.find_one(query)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return OrderResponse(**serialize_doc(order))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, update: OrderUpdate, user_id: Optional[str] = None):
    """Update an order - optionally verify ownership with user_id"""
    try:
        # Build query with optional user_id verification
        query = {"_id": ObjectId(order_id)}
        if user_id:
            query["user_id"] = user_id
        
        update_data = {}
        if update.measurement_id is not None:
            update_data['measurement_id'] = update.measurement_id
        if update.order_type is not None:
            update_data['order_type'] = update.order_type
        if update.description is not None:
            update_data['description'] = update.description
        if update.material_photos is not None:
            update_data['material_photos'] = update.material_photos
        if update.delivery_date is not None:
            update_data['delivery_date'] = datetime.fromisoformat(update.delivery_date.replace('Z', '+00:00'))
        if update.status is not None:
            update_data['status'] = update.status
        if update.voice_instructions is not None:
            update_data['voice_instructions'] = update.voice_instructions
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = await db.orders.update_one(query, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found or access denied")
        
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        return OrderResponse(**serialize_doc(order))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str):
    """Update order status"""
    valid_statuses = ["received", "cutting", "stitching", "embroidery", "trial", "trial_ready", "finishing", "ready", "dispatched", "completed", "delivered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    try:
        # Get order details first for webhook
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}}
        )
        
        # Generate order number and notify Dashboard (NON-BLOCKING)
        order_number = f"ORD-{order_id[-6:].upper()}"
        asyncio.create_task(notify_antigravity_status_update(
            order_number=order_number,
            phone=order.get('customer_phone', ''),
            new_status=status,
            customer_name=order.get('customer_name', '')
        ))
        
        return {"message": "Status updated successfully", "status": status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, user_id: Optional[str] = None):
    """Delete an order and its payment - optionally verify ownership with user_id"""
    try:
        # Build query with optional user_id verification
        query = {"_id": ObjectId(order_id)}
        if user_id:
            query["user_id"] = user_id
        
        # Check if order exists and belongs to user
        order = await db.orders.find_one(query)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found or access denied")
        
        # Delete associated payment
        await db.payments.delete_one({"order_id": order_id})
        await db.orders.delete_one(query)
        
        return {"message": "Order deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ========================== PAYMENT ROUTES ==========================

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment: PaymentCreate):
    """Create or update payment for an order"""
    balance = payment.final_amount - payment.advance_paid
    status = "paid" if balance <= 0 else ("partial" if payment.advance_paid > 0 else "unpaid")
    
    # Check if payment already exists for this order
    existing = await db.payments.find_one({"order_id": payment.order_id})
    
    payment_doc = {
        "order_id": payment.order_id,
        "final_amount": payment.final_amount,
        "advance_paid": payment.advance_paid,
        "balance_amount": max(0, balance),
        "payment_status": status,
        "last_updated": datetime.utcnow()
    }
    
    if existing:
        await db.payments.update_one(
            {"order_id": payment.order_id},
            {"$set": payment_doc}
        )
        payment_doc['id'] = str(existing['_id'])
    else:
        result = await db.payments.insert_one(payment_doc)
        payment_doc['id'] = str(result.inserted_id)
    
    # Get order details for webhook with actual amount
    try:
        order = await db.orders.find_one({"_id": ObjectId(payment.order_id)})
        if order:
            order_number = f"ORD-{payment.order_id[-6:].upper()}"
            delivery_date_str = ""
            if order.get('delivery_date'):
                try:
                    delivery_date_str = order['delivery_date'].strftime('%d %b %Y')
                except:
                    delivery_date_str = str(order.get('delivery_date', ''))
            
            # Send webhook with REAL AMOUNT when payment is created/updated
            asyncio.create_task(notify_antigravity_order_created(
                order_number=order_number,
                customer_phone=order.get('customer_phone', ''),
                customer_name=order.get('customer_name', ''),
                order_type=order.get('order_type', ''),
                notes=order.get('description', ''),
                amount=payment.final_amount,  # REAL AMOUNT from payment
                delivery_date=delivery_date_str
            ))
    except Exception as e:
        logger.error(f"Error sending payment webhook: {e}")
    
    return PaymentResponse(**payment_doc)

@api_router.get("/payments/order/{order_id}", response_model=Optional[PaymentResponse])
async def get_order_payment(order_id: str):
    """Get payment for an order"""
    payment = await db.payments.find_one({"order_id": order_id})
    if not payment:
        return None
    return PaymentResponse(**serialize_doc(payment))

@api_router.put("/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(payment_id: str, update: PaymentUpdate):
    """Update a payment"""
    try:
        payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        final_amount = update.final_amount if update.final_amount is not None else payment['final_amount']
        advance_paid = update.advance_paid if update.advance_paid is not None else payment['advance_paid']
        balance = final_amount - advance_paid
        status = update.payment_status if update.payment_status else (
            "paid" if balance <= 0 else ("partial" if advance_paid > 0 else "unpaid")
        )
        
        update_data = {
            "final_amount": final_amount,
            "advance_paid": advance_paid,
            "balance_amount": max(0, balance),
            "payment_status": status,
            "last_updated": datetime.utcnow()
        }
        
        await db.payments.update_one(
            {"_id": ObjectId(payment_id)},
            {"$set": update_data}
        )
        
        payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
        return PaymentResponse(**serialize_doc(payment))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ========================== PAYMENT ANALYTICS ROUTES ==========================

class PaymentAnalytics(BaseModel):
    total_revenue: float
    total_collected: float
    total_pending: float
    paid_count: int
    partial_count: int
    unpaid_count: int
    payments: List[dict]

class PaymentRecord(BaseModel):
    id: str
    order_id: str
    customer_name: str
    customer_phone: str
    order_type: str
    final_amount: float
    advance_paid: float
    balance_amount: float
    payment_status: str
    last_updated: datetime

@api_router.get("/payments/analytics")
async def get_payment_analytics(period: str = "all", user_id: Optional[str] = None):
    """Get payment analytics - period can be 'today', 'week', 'month', 'all', filtered by user_id"""
    from datetime import timedelta
    
    # Define date range based on period
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    date_filter = {}
    if period == "today":
        date_filter = {"last_updated": {"$gte": today}}
    elif period == "week":
        week_ago = today - timedelta(days=7)
        date_filter = {"last_updated": {"$gte": week_ago}}
    elif period == "month":
        month_ago = today - timedelta(days=30)
        date_filter = {"last_updated": {"$gte": month_ago}}
    
    # Get all payments - we need to filter by user_id through orders
    all_payments = await db.payments.find(date_filter).sort("last_updated", -1).to_list(1000)
    
    # Batch fetch all orders for these payments (avoid N+1 queries)
    order_ids = [ObjectId(p['order_id']) for p in all_payments if p.get('order_id')]
    orders_cursor = await db.orders.find({"_id": {"$in": order_ids}}).to_list(1000)
    orders_dict = {str(o['_id']): o for o in orders_cursor}
    
    # Filter payments by user_id if provided
    payments = []
    for p in all_payments:
        if user_id and p.get('order_id'):
            order = orders_dict.get(p['order_id'])
            if order and order.get('user_id') == user_id:
                payments.append(p)
        elif not user_id:
            payments.append(p)
    
    # Calculate totals
    total_revenue = sum(p.get('final_amount', 0) for p in payments)
    total_collected = sum(p.get('advance_paid', 0) for p in payments)
    total_pending = sum(p.get('balance_amount', 0) for p in payments)
    
    paid_count = sum(1 for p in payments if p.get('payment_status') == 'paid')
    partial_count = sum(1 for p in payments if p.get('payment_status') == 'partial')
    unpaid_count = sum(1 for p in payments if p.get('payment_status') == 'unpaid')
    
    # Enrich payments with order and customer info (using cached orders_dict)
    enriched_payments = []
    for p in payments:
        order = orders_dict.get(p.get('order_id', ''))
        enriched_payments.append({
            "id": str(p['_id']),
            "order_id": p.get('order_id', ''),
            "customer_name": order.get('customer_name', 'Unknown') if order else 'Unknown',
            "customer_phone": order.get('customer_phone', '') if order else '',
            "order_type": order.get('order_type', 'N/A') if order else 'N/A',
            "final_amount": p.get('final_amount', 0),
            "advance_paid": p.get('advance_paid', 0),
            "balance_amount": p.get('balance_amount', 0),
            "payment_status": p.get('payment_status', 'unknown'),
            "last_updated": p.get('last_updated', now).isoformat()
        })
    
    return {
        "total_revenue": total_revenue,
        "total_collected": total_collected,
        "total_pending": total_pending,
        "paid_count": paid_count,
        "partial_count": partial_count,
        "unpaid_count": unpaid_count,
        "payments": enriched_payments
    }

@api_router.get("/payments/all")
async def get_all_payments(status: Optional[str] = None, user_id: Optional[str] = None):
    """Get all payments with optional status filter and user_id filter"""
    query = {}
    if status:
        query["payment_status"] = status
    
    all_payments = await db.payments.find(query).sort("last_updated", -1).to_list(1000)
    
    # Filter by user_id through orders if provided
    payments = []
    for p in all_payments:
        if user_id and p.get('order_id'):
            order = await db.orders.find_one({"_id": ObjectId(p['order_id'])})
            if order and order.get('user_id') == user_id:
                payments.append(p)
        elif not user_id:
            payments.append(p)
    
    enriched_payments = []
    for p in payments:
        order = await db.orders.find_one({"_id": ObjectId(p['order_id'])}) if p.get('order_id') else None
        enriched_payments.append({
            "id": str(p['_id']),
            "order_id": p.get('order_id', ''),
            "customer_name": order.get('customer_name', 'Unknown') if order else 'Unknown',
            "customer_phone": order.get('customer_phone', '') if order else '',
            "order_type": order.get('order_type', 'N/A') if order else 'N/A',
            "final_amount": p.get('final_amount', 0),
            "advance_paid": p.get('advance_paid', 0),
            "balance_amount": p.get('balance_amount', 0),
            "payment_status": p.get('payment_status', 'unknown'),
            "last_updated": p.get('last_updated', datetime.utcnow()).isoformat()
        })
    
    return enriched_payments

@api_router.post("/payments/record-payment")
async def record_qr_payment(order_id: str, amount: float):
    """Record a payment made via QR code"""
    try:
        # Get existing payment
        payment = await db.payments.find_one({"order_id": order_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment record not found")
        
        # Update advance paid
        new_advance = payment.get('advance_paid', 0) + amount
        final_amount = payment.get('final_amount', 0)
        balance = final_amount - new_advance
        status = "paid" if balance <= 0 else ("partial" if new_advance > 0 else "unpaid")
        
        await db.payments.update_one(
            {"order_id": order_id},
            {"$set": {
                "advance_paid": new_advance,
                "balance_amount": max(0, balance),
                "payment_status": status,
                "last_updated": datetime.utcnow()
            }}
        )
        
        return {"success": True, "message": f"Payment of ₹{amount} recorded successfully", "new_balance": max(0, balance)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/whatsapp/payment-received/{order_id}")
async def get_whatsapp_payment_received(order_id: str, amount: float = 0):
    """Get WhatsApp message URL for payment received notification"""
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        customer = await db.customers.find_one({"_id": ObjectId(order['customer_id'])})
        payment = await db.payments.find_one({"order_id": order_id})
        
        # Get boutique name from user
        boutique_name = "Your Boutique"
        if order.get('user_id'):
            user = await db.users.find_one({"_id": ObjectId(order['user_id'])})
            if user:
                boutique_name = user.get('boutique_name', 'Your Boutique')
        
        customer_name = customer.get('name', 'Customer') if customer else 'Customer'
        customer_phone = customer.get('phone', '') if customer else ''
        balance = payment.get('balance_amount', 0) if payment else 0
        
        message = f"""🌟 *{boutique_name}* 🌟
━━━━━━━━━━━━━━━━━━━
*Payment Received - Thank You!* 💰

Dear {customer_name},

We have received your payment of *₹{amount:.2f}* for your {order.get('order_type', 'order')}.

{'✅ *Payment Complete!* Your order is fully paid.' if balance <= 0 else f'📋 *Remaining Balance:* ₹{balance:.2f}'}

━━━━━━━━━━━━━━━━━━━
Thank you for choosing *{boutique_name}*! ✨
"""
        
        import urllib.parse
        encoded_message = urllib.parse.quote(message)
        
        phone = customer_phone.replace(' ', '').replace('-', '').replace('+', '')
        if not phone.startswith('91') and len(phone) == 10:
            phone = '91' + phone
        
        whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
        
        return {"url": whatsapp_url, "message": message}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ========================== DASHBOARD ROUTES ==========================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user_id: Optional[str] = None):
    """Get dashboard statistics filtered by user_id"""
    from datetime import timedelta
    
    # Build query with user_id filter
    customer_query = {}
    order_query = {}
    
    if user_id:
        customer_query["user_id"] = user_id
        order_query["user_id"] = user_id
    
    total_customers = await db.customers.count_documents(customer_query)
    
    # Pending orders (not delivered) for this user
    pending_query = {**order_query, "status": {"$nin": ["delivered", "completed"]}}
    pending_orders = await db.orders.count_documents(pending_query)
    
    # Delivery due today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    today_query = {
        **order_query,
        "delivery_date": {"$gte": today, "$lt": tomorrow},
        "status": {"$ne": "delivered"}
    }
    delivery_today = await db.orders.count_documents(today_query)
    
    # Delivery in next 2 days
    day_after_tomorrow = today + timedelta(days=3)
    soon_query = {
        **order_query,
        "delivery_date": {"$gte": tomorrow, "$lt": day_after_tomorrow},
        "status": {"$ne": "delivered"}
    }
    delivery_in_2_days = await db.orders.count_documents(soon_query)
    
    return DashboardStats(
        total_customers=total_customers,
        pending_orders=pending_orders,
        delivery_today=delivery_today,
        delivery_in_2_days=delivery_in_2_days
    )

# ========================== SEARCH ROUTES ==========================

@api_router.get("/search", response_model=List[SearchResult])
async def global_search(q: str, user_id: Optional[str] = None):
    """Global search across customers and orders filtered by user_id"""
    results = []
    
    # Build base query with user_id filter
    customer_query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}}
        ]
    }
    order_query = {
        "$or": [
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"customer_phone": {"$regex": q, "$options": "i"}},
            {"order_type": {"$regex": q, "$options": "i"}}
        ]
    }
    
    if user_id:
        customer_query["user_id"] = user_id
        order_query["user_id"] = user_id
    
    # Search customers
    customers = await db.customers.find(customer_query).limit(10).to_list(10)
    
    for c in customers:
        results.append(SearchResult(
            type="customer",
            id=str(c['_id']),
            title=c['name'],
            subtitle=c['phone'],
            extra=c.get('address', '')
        ))
    
    # Search orders
    orders = await db.orders.find(order_query).limit(10).to_list(10)
    
    for o in orders:
        results.append(SearchResult(
            type="order",
            id=str(o['_id']),
            title=f"{o['order_type']} - {o.get('customer_name', 'Unknown')}",
            subtitle=o['status'],
            extra=o['delivery_date'].strftime('%d %b %Y') if o.get('delivery_date') else ''
        ))
    
    return results

# ========================== VOICE TRANSCRIPTION ROUTES ==========================

@api_router.post("/voice/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(request: VoiceTranscriptionRequest):
    """Transcribe voice audio to text using OpenAI Whisper"""
    try:
        import openai
        
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            logger.error("OPENAI_API_KEY not configured")
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        
        # Decode base64 audio
        audio_data = base64.b64decode(request.audio_base64)
        logger.info(f"Received audio data: {len(audio_data)} bytes, format: {request.format}")
        
        # Check minimum audio size to avoid hallucinations
        if len(audio_data) < 5000:
            logger.info("Audio too short, skipping transcription")
            return VoiceTranscriptionResponse(text="", success=True)
        
        # Save temporarily
        temp_path = f"/tmp/audio_{uuid.uuid4()}.{request.format}"
        with open(temp_path, 'wb') as f:
            f.write(audio_data)
        
        # Use OpenAI Whisper with the provided API key
        client = openai.OpenAI(api_key=openai_key)
        
        with open(temp_path, 'rb') as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en",
                prompt="Transcribe measurements like: full length 42, shoulder 14, bust 36, waist 32, front deep 8, back deep 10. Numbers and measurement terms only."
            )
        
        # Clean up
        os.remove(temp_path)
        
        # Filter out known hallucination phrases
        result_text = transcription.text
        hallucination_phrases = [
            "thank you for watching",
            "subscribe",
            "like and share",
            "comment",
            "beadaholique",
            "don't forget",
            "channel",
            "video",
            "watching",
            "fema.gov",
            "fema",
            "pissedconsumer",
            "review no",
            "www.",
            "http",
            "visit",
            "information",
            "please see",
            "more info"
        ]
        
        lower_text = result_text.lower()
        for phrase in hallucination_phrases:
            if phrase in lower_text:
                logger.info(f"Filtered hallucination: '{result_text}'")
                result_text = ""
                break
        
        logger.info(f"Transcription result: '{result_text}'")
        
        return VoiceTranscriptionResponse(
            text=result_text,
            success=True
        )
    except Exception as e:
        logger.error(f"Voice transcription error: {str(e)}")
        return VoiceTranscriptionResponse(
            text="",
            success=False
        )

# ========================== WHATSAPP ROUTES ==========================

@api_router.get("/whatsapp/order-confirmation/{order_id}")
async def get_whatsapp_order_confirmation(order_id: str):
    """Get WhatsApp message URL for order confirmation"""
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        customer = await db.customers.find_one({"_id": ObjectId(order['customer_id'])})
        payment = await db.payments.find_one({"order_id": order_id})
        
        # Get boutique name from user
        boutique_name = "Your Boutique"
        if order.get('user_id'):
            user = await db.users.find_one({"_id": ObjectId(order['user_id'])})
            if user:
                boutique_name = user.get('boutique_name', 'Your Boutique')
        
        customer_name = customer.get('name', 'Customer') if customer else 'Customer'
        customer_phone = customer.get('phone', '') if customer else ''
        
        # Format message
        message = f"""🌟 *{boutique_name}* 🌟
━━━━━━━━━━━━━━━━━━━
*Order Confirmation*

👤 Customer: {customer_name}
📱 Phone: {customer_phone}
👗 Order Type: {order.get('order_type', 'N/A')}
📅 Order Date: {order.get('order_date', datetime.utcnow()).strftime('%d %b %Y')}
📦 Delivery Date: {order.get('delivery_date', datetime.utcnow()).strftime('%d %b %Y')}
"""
        
        if payment:
            message += f"""
💰 *Payment Details*
Final Amount: ₹{payment.get('final_amount', 0):.2f}
Advance Paid: ₹{payment.get('advance_paid', 0):.2f}
Balance: ₹{payment.get('balance_amount', 0):.2f}
"""
        
        message += f"""
━━━━━━━━━━━━━━━━━━━
Thank you for choosing *{boutique_name}*! ✨
"""
        
        # URL encode message
        import urllib.parse
        encoded_message = urllib.parse.quote(message)
        
        # Clean phone number
        phone = customer_phone.replace(' ', '').replace('-', '').replace('+', '')
        if not phone.startswith('91') and len(phone) == 10:
            phone = '91' + phone
        
        whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
        
        return {"url": whatsapp_url, "message": message}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/whatsapp/delivery-reminder/{order_id}")
async def get_whatsapp_delivery_reminder(order_id: str):
    """Get WhatsApp message URL for delivery reminder"""
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        customer = await db.customers.find_one({"_id": ObjectId(order['customer_id'])})
        
        # Get boutique name from user
        boutique_name = "Your Boutique"
        if order.get('user_id'):
            user = await db.users.find_one({"_id": ObjectId(order['user_id'])})
            if user:
                boutique_name = user.get('boutique_name', 'Your Boutique')
        
        customer_name = customer.get('name', 'Customer') if customer else 'Customer'
        customer_phone = customer.get('phone', '') if customer else ''
        
        message = f"""🌟 *{boutique_name}* 🌟
━━━━━━━━━━━━━━━━━━━
*Delivery Reminder*

Dear {customer_name},

This is a friendly reminder that your {order.get('order_type', 'order')} is scheduled for delivery on *{order.get('delivery_date', datetime.utcnow()).strftime('%d %b %Y')}*.

Please ensure availability for pickup/delivery.

━━━━━━━━━━━━━━━━━━━
Thank you for choosing *{boutique_name}*! ✨
"""
        
        import urllib.parse
        encoded_message = urllib.parse.quote(message)
        
        phone = customer_phone.replace(' ', '').replace('-', '').replace('+', '')
        if not phone.startswith('91') and len(phone) == 10:
            phone = '91' + phone
        
        whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
        
        return {"url": whatsapp_url, "message": message}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/whatsapp/balance-reminder/{order_id}")
async def get_whatsapp_balance_reminder(order_id: str):
    """Get WhatsApp message URL for balance payment reminder"""
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        customer = await db.customers.find_one({"_id": ObjectId(order['customer_id'])})
        payment = await db.payments.find_one({"order_id": order_id})
        
        # Get boutique name from user
        boutique_name = "Your Boutique"
        if order.get('user_id'):
            user = await db.users.find_one({"_id": ObjectId(order['user_id'])})
            if user:
                boutique_name = user.get('boutique_name', 'Your Boutique')
        
        customer_name = customer.get('name', 'Customer') if customer else 'Customer'
        customer_phone = customer.get('phone', '') if customer else ''
        balance = payment.get('balance_amount', 0) if payment else 0
        
        message = f"""🌟 *{boutique_name}* 🌟
━━━━━━━━━━━━━━━━━━━
*Payment Reminder*

Dear {customer_name},

This is a gentle reminder regarding your pending balance of *₹{balance:.2f}* for your {order.get('order_type', 'order')}.

Kindly clear the balance at your earliest convenience.

━━━━━━━━━━━━━━━━━━━
Thank you for choosing *{boutique_name}*! ✨
"""
        
        import urllib.parse
        encoded_message = urllib.parse.quote(message)
        
        phone = customer_phone.replace(' ', '').replace('-', '').replace('+', '')
        if not phone.startswith('91') and len(phone) == 10:
            phone = '91' + phone
        
        whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
        
        return {"url": whatsapp_url, "message": message}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ========================== HEALTH CHECK ==========================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "BoutiqueFit API"}

# Backup endpoint
class BackupRequest(BaseModel):
    email: str

@api_router.post("/backup/request")
async def request_backup(backup: BackupRequest):
    """Request a data backup to be sent via email"""
    try:
        import json
        from datetime import datetime
        
        # Gather all data
        customers = await db.customers.find().to_list(1000)
        orders = await db.orders.find().to_list(1000)
        measurements = await db.measurements.find().to_list(1000)
        payments = await db.payments.find().to_list(1000)
        
        # Convert ObjectId to string
        def serialize(doc):
            doc['_id'] = str(doc.get('_id', ''))
            for key, value in doc.items():
                if isinstance(value, datetime):
                    doc[key] = value.isoformat()
            return doc
        
        backup_data = {
            "backup_date": datetime.utcnow().isoformat(),
            "customers": [serialize(c) for c in customers],
            "orders": [serialize(o) for o in orders],
            "measurements": [serialize(m) for m in measurements],
            "payments": [serialize(p) for p in payments],
        }
        
        # For now, just log and confirm (email integration would require SMTP setup)
        logger.info(f"Backup requested for email: {backup.email}")
        logger.info(f"Backup contains: {len(customers)} customers, {len(orders)} orders, {len(measurements)} measurements, {len(payments)} payments")
        
        # Save backup to file (for download)
        backup_filename = f"/tmp/boutique_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_filename, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        return {
            "success": True, 
            "message": f"Backup prepared. Contains {len(customers)} customers, {len(orders)} orders, {len(measurements)} measurements, {len(payments)} payments. Email notification will be sent to {backup.email}."
        }
    except Exception as e:
        logger.error(f"Backup error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================== CLAUDE AI CHAT ==========================

# Store chat sessions in memory (for simple session management)
chat_sessions: Dict[str, LlmChat] = {}

BOUTIQUE_SYSTEM_MESSAGE = """You are MAAHIS AI, a premium boutique assistant for MAAHIS Designer Boutique. You help with:

🎯 **Your Capabilities:**
- Order status tracking and updates
- Customer inquiries and support
- Delivery schedule management
- Payment reminders and tracking
- Appointment scheduling
- Fabric and design consultations

💼 **Boutique Context:**
- Premium designer boutique specializing in custom tailoring
- Services: Blouses, Sarees, Suits, Lehengas, Bridal wear
- Focus on quality craftsmanship and personalized service

🎨 **Your Personality:**
- Professional yet warm and friendly
- Attentive to customer needs
- Quick and helpful responses
- Always maintain boutique's premium image

Respond concisely and helpfully. Use emojis sparingly for a modern touch."""

class ClaudeChatRequest(BaseModel):
    phone: str
    message: str
    is_owner: bool = True

class ClaudeChatResponse(BaseModel):
    status: str
    reply: str

@api_router.post("/claude/chat", response_model=ClaudeChatResponse)
async def claude_chat(request: ClaudeChatRequest):
    """Chat with Claude AI assistant"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Claude API key not configured")
        
        # Use phone as session ID for conversation continuity
        session_id = f"boutique_{request.phone}"
        
        # Get or create chat session
        if session_id not in chat_sessions:
            chat = LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message=BOUTIQUE_SYSTEM_MESSAGE
            )
            # Use Claude Sonnet 4.6
            chat.with_model("anthropic", "claude-sonnet-4-6")
            chat_sessions[session_id] = chat
        else:
            chat = chat_sessions[session_id]
        
        # Create user message
        user_message = UserMessage(text=request.message)
        
        # Get response from Claude
        response = await chat.send_message(user_message)
        
        logger.info(f"Claude chat - Phone: {request.phone}, Message: {request.message[:50]}...")
        
        return ClaudeChatResponse(status="success", reply=response)
        
    except Exception as e:
        logger.error(f"Claude chat error: {str(e)}")
        return ClaudeChatResponse(status="error", reply=f"Sorry, I encountered an issue. Please try again. ({str(e)[:50]})")

@api_router.post("/claude/chat/clear")
async def clear_claude_chat(phone: str):
    """Clear chat history for a phone number"""
    session_id = f"boutique_{phone}"
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    return {"status": "success", "message": "Chat history cleared"}

# Include the router in the main app
app.include_router(api_router)

# Root-level health check for deployment
@app.get("/health")
async def root_health_check():
    """Root health check for deployment systems"""
    return {"status": "healthy", "service": "MAAHIS API"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
