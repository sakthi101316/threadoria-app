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
        "notes": notes
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
    payload = {
        "order_number": order_number,
        "customer_name": customer_name,
        "action": "deleted"
    }
    return await send_webhook("order_delete", payload)

async def notify_dashboard_status_changed(order_number: str, new_status: str, customer_name: str, customer_phone: str):
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

# ========================== AUTH ROUTES ==========================

@api_router.post("/auth/send-otp")
async def send_otp(request: SendSMSOTPRequest):
    phone = request.phone
    if not phone.startswith('+'):
        phone = '+91' + phone.lstrip('0')
    
    existing_user = await db.users.find_one({"phone": phone})
    if existing_user:
        return {"success": False, "message": "Phone already registered. Please login."}
    
    otp = generate_otp()
    otp_storage[phone] = {"otp": otp, "created_at": datetime.utcnow()}
    
    sms_sent = send_sms_otp(phone, otp)
    if sms_sent:
        return {"success": True, "message": f"OTP sent to {phone}"}
    else:
        return {"success": True, "message": f"OTP sent to {phone}. (Demo: use {otp})"}

@api_router.post("/auth/register", response_model=UserResponse)
async def register(data: UserRegister):
    phone = data.phone
    email = data.email.lower()
    
    if not phone.startswith('+'):
        phone = '+91' + phone.lstrip('0')
    
    if await db.users.find_one({"phone": phone}):
        return UserResponse(success=False, message="Phone already registered")
    
    if await db.users.find_one({"email": email}):
        return UserResponse(success=False, message="Email already registered")
    
    stored_otp = otp_storage.get(phone)
    if stored_otp and stored_otp["otp"] != data.otp:
        return UserResponse(success=False, message="Invalid OTP")
    
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
    if phone in otp_storage:
        del otp_storage[phone]
    
    return UserResponse(success=True, message="Registration successful!", user_id=str(result.inserted_id), boutique_name=data.boutique_name)

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    identifier = credentials.email.lower()
    
    ALLOWED_USERS = {
        "8608080103": "101316",
        "9944151122": "994415",
    }
    
    if identifier not in ALLOWED_USERS or credentials.pin != ALLOWED_USERS.get(identifier):
        return UserResponse(success=False, message="Access restricted for internal use only.")
    
    user = await db.users.find_one({
        "$or": [
            {"email": identifier, "pin": credentials.pin},
            {"phone": identifier, "pin": credentials.pin},
            {"phone": '+91' + identifier.lstrip('0'), "pin": credentials.pin}
        ]
    })
    
    if user:
        return UserResponse(success=True, message="Login successful", user_id=str(user["_id"]), boutique_name=user.get("boutique_name", "Boutique"))
    
    boutique_name = "MAAHIS Boutique" if identifier == "8608080103" else "NEETUS Boutique"
    owner_name = "MAAHIS" if identifier == "8608080103" else "NEETUS"
    
    user_data = {
        "boutique_name": boutique_name,
        "owner_name": owner_name,
        "email": f"{owner_name.lower()}@boutique.com",
        "phone": identifier,
        "pin": ALLOWED_USERS[identifier],
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user_data)
    return UserResponse(success=True, message="Login successful", user_id=str(result.inserted_id), boutique_name=boutique_name)

# ========================== CUSTOMER ROUTES ==========================

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate):
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
    query = {"_id": ObjectId(customer_id)}
    if user_id:
        query["user_id"] = user_id
    customer = await db.customers.find_one(query)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(**serialize_doc(customer))

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, update: CustomerUpdate, user_id: Optional[str] = None):
    query = {"_id": ObjectId(customer_id)}
    if user_id:
        query["user_id"] = user_id
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.customers.update_one(query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    return CustomerResponse(**serialize_doc(customer))

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user_id: Optional[str] = None):
    query = {"_id": ObjectId(customer_id)}
    if user_id:
        query["user_id"] = user_id
    
    customer = await db.customers.find_one(query)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    await db.measurements.delete_many({"customer_id": customer_id})
    await db.orders.delete_many({"customer_id": customer_id})
    await db.customers.delete_one(query)
    
    return {"message": "Customer deleted successfully"}

# ========================== MEASUREMENT ROUTES ==========================

def safe_float(val):
    if val is None or val == '':
        return 0.0
    try:
        return float(val)
    except:
        return 0.0

@api_router.post("/measurements", response_model=MeasurementResponse)
async def create_measurement(request: Request):
    try:
        raw_body = await request.json()
        customer_id = raw_body.get('customer_id')
        if not customer_id:
            raise HTTPException(status_code=422, detail="customer_id is required")
        
        top_data = raw_body.get('top_measurements') or raw_body.get('top')
        bottom_data = raw_body.get('bottom_measurements') or raw_body.get('bottom')
        
        category = raw_body.get('category', 'Top')
        
        processed_top = None
        if top_data:
            processed_top = {k: safe_float(top_data.get(k, 0)) for k in ['full_length', 'shoulder', 'upper_chest', 'bust', 'waist', 'front_deep', 'back_deep', 'sleeve_length', 'sleeve_round', 'arm_hole', 'biceps', 'dot_point', 'dot_to_dot', 'slit_length', 'seat_round']}
        
        processed_bottom = None
        if bottom_data:
            processed_bottom = {k: safe_float(bottom_data.get(k, 0)) for k in ['length', 'hip_round', 'thighs', 'knees', 'ankle']}
        
        measurement_doc = {
            "customer_id": customer_id,
            "category": category,
            "top_measurements": processed_top,
            "bottom_measurements": processed_bottom,
            "reference_photos": raw_body.get('reference_photos', []),
            "measurement_date": datetime.utcnow(),
            "added_by_voice": raw_body.get('added_by_voice', False)
        }
        
        result = await db.measurements.insert_one(measurement_doc)
        measurement_doc['id'] = str(result.inserted_id)
        return MeasurementResponse(**measurement_doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/measurements/customer/{customer_id}", response_model=List[MeasurementResponse])
async def get_customer_measurements(customer_id: str):
    measurements = await db.measurements.find({"customer_id": customer_id}).sort("measurement_date", -1).to_list(100)
    return [MeasurementResponse(**serialize_doc(m)) for m in measurements]

@api_router.get("/measurements/{measurement_id}", response_model=MeasurementResponse)
async def get_measurement(measurement_id: str):
    measurement = await db.measurements.find_one({"_id": ObjectId(measurement_id)})
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return MeasurementResponse(**serialize_doc(measurement))

@api_router.put("/measurements/{measurement_id}", response_model=MeasurementResponse)
async def update_measurement(measurement_id: str, update: MeasurementUpdate):
    update_data = {}
    if update.category is not None:
        update_data['category'] = update.category
    if update.top_measurements is not None:
        update_data['top_measurements'] = update.top_measurements.dict()
    if update.bottom_measurements is not None:
        update_data['bottom_measurements'] = update.bottom_measurements.dict()
    if update.reference_photos is not None:
        update_data['reference_photos'] = update.reference_photos
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    
    result = await db.measurements.update_one({"_id": ObjectId(measurement_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Measurement not found")
    
    measurement = await db.measurements.find_one({"_id": ObjectId(measurement_id)})
    return MeasurementResponse(**serialize_doc(measurement))

@api_router.delete("/measurements/{measurement_id}")
async def delete_measurement(measurement_id: str):
    result = await db.measurements.delete_one({"_id": ObjectId(measurement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return {"message": "Measurement deleted"}

# ========================== ORDER ROUTES ==========================

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate):
    logger.info(f"=== CREATE ORDER START ===")
    
    customer = await db.customers.find_one({"_id": ObjectId(order.customer_id)})
    customer_name = customer.get("name", "Unknown") if customer else "Unknown"
    customer_phone = customer.get("phone", "") if customer else ""
    user_id = customer.get("user_id") if customer else None
    
    order_count = await db.orders.count_documents({"user_id": user_id}) if user_id else await db.orders.count_documents({})
    order_number = f"ORD-{(order_count + 1):04d}"
    
    delivery_date_str = ""
    try:
        dd = datetime.fromisoformat(order.delivery_date.replace('Z', '+00:00'))
        delivery_date_str = dd.strftime('%d %b %Y')
    except:
        delivery_date_str = order.delivery_date
    
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
        "amount": order.amount or 0,
        "advance_paid": order.advance_paid or 0,
        "order_number": order_number,
        "created_at": datetime.utcnow()
    }
    
    result = await db.orders.insert_one(order_doc)
    order_doc['id'] = str(result.inserted_id)
    
    asyncio.create_task(notify_dashboard_order_created(
        order_number=order_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        order_type=order.order_type,
        amount=order.amount or 0,
        advance_paid=order.advance_paid or 0,
        delivery_date=delivery_date_str,
        notes=order.description or order.voice_instructions or ""
    ))
    
    logger.info(f"=== ORDER CREATED: {order_number} for {customer_name} ===")
    return OrderResponse(**order_doc)

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(status: Optional[str] = None, customer_id: Optional[str] = None, search: Optional[str] = None, user_id: Optional[str] = None):
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
    
    projection = {"material_photos": 0}
    orders = await db.orders.find(query, projection).sort("created_at", -1).to_list(1000)
    
    result = []
    for o in orders:
        order_data = serialize_doc(o)
        order_data['material_photos'] = []
        result.append(OrderResponse(**order_data))
    return result

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, user_id: Optional[str] = None):
    query = {"_id": ObjectId(order_id)}
    if user_id:
        query["user_id"] = user_id
    order = await db.orders.find_one(query)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse(**serialize_doc(order))

@api_router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, update: OrderUpdate, user_id: Optional[str] = None):
    query = {"_id": ObjectId(order_id)}
    if user_id:
        query["user_id"] = user_id
    
    order = await db.orders.find_one(query)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {}
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
    if update.amount is not None:
        update_data['amount'] = update.amount
    if update.advance_paid is not None:
        update_data['advance_paid'] = update.advance_paid
    
    if update_data:
        await db.orders.update_one(query, {"$set": update_data})
    
    updated_order = await db.orders.find_one({"_id": ObjectId(order_id)})
    
    order_number = updated_order.get('order_number') or f"ORD-{order_id[-6:].upper()}"
    payment = await db.payments.find_one({"order_id": order_id})
    amount = payment.get('final_amount', 0) if payment else updated_order.get('amount', 0)
    advance = payment.get('advance_paid', 0) if payment else updated_order.get('advance_paid', 0)
    
    asyncio.create_task(notify_dashboard_order_updated(
        order_number=order_number,
        amount=amount,
        advance_paid=advance,
        status=updated_order.get('status', 'received'),
        customer_name=updated_order.get('customer_name', '')
    ))
    
    return OrderResponse(**serialize_doc(updated_order))

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str):
    valid_statuses = ["received", "cutting", "stitching", "embroidery", "trial", "trial_ready", "finishing", "ready", "dispatched", "completed", "delivered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": status}})
    
    order_number = order.get('order_number') or f"ORD-{order_id[-6:].upper()}"
    
    asyncio.create_task(notify_dashboard_status_changed(
        order_number=order_number,
        new_status=status,
        customer_name=order.get('customer_name', ''),
        customer_phone=order.get('customer_phone', '')
    ))
    
    payment = await db.payments.find_one({"order_id": order_id})
    amount = payment.get('final_amount', 0) if payment else order.get('amount', 0)
    advance = payment.get('advance_paid', 0) if payment else order.get('advance_paid', 0)
    
    asyncio.create_task(notify_dashboard_order_updated(
        order_number=order_number,
        amount=amount,
        advance_paid=advance,
        status=status,
        customer_name=order.get('customer_name', '')
    ))
    
    return {"message": "Status updated", "status": status}

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, user_id: Optional[str] = None):
    query = {"_id": ObjectId(order_id)}
    if user_id:
        query["user_id"] = user_id
    
    order = await db.orders.find_one(query)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_number = order.get('order_number') or f"ORD-{order_id[-6:].upper()}"
    customer_name = order.get('customer_name', 'Unknown')
    
    await db.payments.delete_one({"order_id": order_id})
    await db.orders.delete_one(query)
    
    asyncio.create_task(notify_dashboard_order_deleted(
        order_number=order_number,
        customer_name=customer_name
    ))
    
    logger.info(f"=== ORDER DELETED: {order_number} ===")
    return {"message": "Order deleted successfully"}

# ========================== PAYMENT ROUTES ==========================

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment: PaymentCreate):
    balance = payment.final_amount - payment.advance_paid
    status = "paid" if balance <= 0 else ("partial" if payment.advance_paid > 0 else "unpaid")
    
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
        await db.payments.update_one({"order_id": payment.order_id}, {"$set": payment_doc})
        payment_doc['id'] = str(existing['_id'])
    else:
        result = await db.payments.insert_one(payment_doc)
        payment_doc['id'] = str(result.inserted_id)
    
    order = await db.orders.find_one({"_id": ObjectId(payment.order_id)})
    if order:
        order_number = order.get('order_number') or f"ORD-{payment.order_id[-6:].upper()}"
        
        asyncio.create_task(notify_dashboard_order_updated(
            order_number=order_number,
            amount=payment.final_amount,
            advance_paid=payment.advance_paid,
            status=order.get('status', 'received'),
            customer_name=order.get('customer_name', '')
        ))
        
        logger.info(f"=== PAYMENT UPDATED: {order_number} - Amount: {payment.final_amount}, Advance: {payment.advance_paid} ===")
    
    return PaymentResponse(**payment_doc)

@api_router.get("/payments/order/{order_id}", response_model=Optional[PaymentResponse])
async def get_order_payment(order_id: str):
    payment = await db.payments.find_one({"order_id": order_id})
    if not payment:
        return None
    return PaymentResponse(**serialize_doc(payment))

@api_router.put("/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(payment_id: str, update: PaymentUpdate):
    payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    final_amount = update.final_amount if update.final_amount is not None else payment['final_amount']
    advance_paid = update.advance_paid if update.advance_paid is not None else payment['advance_paid']
    balance = final_amount - advance_paid
    status = update.payment_status if update.payment_status else ("paid" if balance <= 0 else ("partial" if advance_paid > 0 else "unpaid"))
    
    update_data = {
        "final_amount": final_amount,
        "advance_paid": advance_paid,
        "balance_amount": max(0, balance),
        "payment_status": status,
        "last_updated": datetime.utcnow()
    }
    
    await db.payments.update_one({"_id": ObjectId(payment_id)}, {"$set": update_data})
    
    order = await db.orders.find_one({"_id": ObjectId(payment['order_id'])})
    if order:
        order_number = order.get('order_number') or f"ORD-{payment['order_id'][-6:].upper()}"
        
        asyncio.create_task(notify_dashboard_order_updated(
            order_number=order_number,
            amount=final_amount,
            advance_paid=advance_paid,
            status=order.get('status', 'received'),
            customer_name=order.get('customer_name', '')
        ))
    
    updated_payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    return PaymentResponse(**serialize_doc(updated_payment))

@api_router.get("/payments/analytics")
async def get_payment_analytics(period: str = "all", user_id: Optional[str] = None):
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    date_filter = {}
    if period == "today":
        date_filter = {"last_updated": {"$gte": today}}
    elif period == "week":
        date_filter = {"last_updated": {"$gte": today - timedelta(days=7)}}
    elif period == "month":
        date_filter = {"last_updated": {"$gte": today - timedelta(days=30)}}
    
    all_payments = await db.payments.find(date_filter).sort("last_updated", -1).to_list(1000)
    
    order_ids = [ObjectId(p['order_id']) for p in all_payments if p.get('order_id')]
    orders_cursor = await db.orders.find({"_id": {"$in": order_ids}}).to_list(1000)
    orders_dict = {str(o['_id']): o for o in orders_cursor}
    
    payments = []
    for p in all_payments:
        order = orders_dict.get(p.get('order_id', ''))
        if user_id and order and order.get('user_id') != user_id:
            continue
        payments.append(p)
    
    total_revenue = sum(p.get('final_amount', 0) for p in payments)
    total_collected = sum(p.get('advance_paid', 0) for p in payments)
    total_pending = sum(p.get('balance_amount', 0) for p in payments)
    
    enriched = []
    for p in payments:
        order = orders_dict.get(p.get('order_id', ''))
        enriched.append({
            "id": str(p['_id']),
            "order_id": p.get('order_id', ''),
            "customer_name": order.get('customer_name', 'Unknown') if order else 'Unknown',
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
        "paid_count": sum(1 for p in payments if p.get('payment_status') == 'paid'),
        "partial_count": sum(1 for p in payments if p.get('payment_status') == 'partial'),
        "unpaid_count": sum(1 for p in payments if p.get('payment_status') == 'unpaid'),
        "payments": enriched
    }

# ========================== DASHBOARD STATS ==========================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user_id: Optional[str] = None):
    customer_query = {"user_id": user_id} if user_id else {}
    order_query = {"user_id": user_id} if user_id else {}
    
    total_customers = await db.customers.count_documents(customer_query)
    pending_orders = await db.orders.count_documents({**order_query, "status": {"$nin": ["delivered", "completed"]}})
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    delivery_today = await db.orders.count_documents({**order_query, "delivery_date": {"$gte": today, "$lt": tomorrow}, "status": {"$ne": "delivered"}})
    delivery_in_2_days = await db.orders.count_documents({**order_query, "delivery_date": {"$gte": tomorrow, "$lt": today + timedelta(days=3)}, "status": {"$ne": "delivered"}})
    
    return DashboardStats(total_customers=total_customers, pending_orders=pending_orders, delivery_today=delivery_today, delivery_in_2_days=delivery_in_2_days)

# ========================== SEARCH ==========================

@api_router.get("/search", response_model=List[SearchResult])
async def global_search(q: str, user_id: Optional[str] = None):
    results = []
    
    customer_query = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q, "$options": "i"}}]}
    if user_id:
        customer_query["user_id"] = user_id
    
    customers = await db.customers.find(customer_query).limit(10).to_list(10)
    for c in customers:
        results.append(SearchResult(type="customer", id=str(c['_id']), title=c['name'], subtitle=c['phone'], extra=c.get('address', '')))
    
    order_query = {"$or": [{"customer_name": {"$regex": q, "$options": "i"}}, {"order_type": {"$regex": q, "$options": "i"}}]}
    if user_id:
        order_query["user_id"] = user_id
    
    orders = await db.orders.find(order_query).limit(10).to_list(10)
    for o in orders:
        results.append(SearchResult(type="order", id=str(o['_id']), title=f"{o['order_type']} - {o.get('customer_name', 'Unknown')}", subtitle=o['status'], extra=o.get('delivery_date', datetime.utcnow()).strftime('%d %b %Y') if o.get('delivery_date') else ''))
    
    return results

# ========================== VOICE TRANSCRIPTION ==========================

@api_router.post("/voice/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(request: VoiceTranscriptionRequest):
    try:
        import openai
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            raise HTTPException(status_code=500, detail="OpenAI key not configured")
        
        audio_data = base64.b64decode(request.audio_base64)
        if len(audio_data) < 5000:
            return VoiceTranscriptionResponse(text="", success=True)
        
        temp_path = f"/tmp/audio_{uuid.uuid4()}.{request.format}"
        with open(temp_path, 'wb') as f:
            f.write(audio_data)
        
        client = openai.OpenAI(api_key=openai_key)
        with open(temp_path, 'rb') as audio_file:
            transcription = client.audio.transcriptions.create(model="whisper-1", file=audio_file, language="en")
        
        os.remove(temp_path)
        
        result_text = transcription.text
        hallucinations = ["thank you for watching", "subscribe", "beadaholique", "fema.gov", "www.", "http"]
        for h in hallucinations:
            if h in result_text.lower():
                result_text = ""
                break
        
        return VoiceTranscriptionResponse(text=result_text, success=True)
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return VoiceTranscriptionResponse(text="", success=False)

# ========================== WHATSAPP ROUTES ==========================

@api_router.get("/whatsapp/work-order/{order_id}")
async def get_whatsapp_work_order(order_id: str):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    customer = await db.customers.find_one({"_id": ObjectId(order['customer_id'])})
    
    boutique_name = "MAAHIS"
    if order.get('user_id'):
        user = await db.users.find_one({"_id": ObjectId(order['user_id'])})
        if user:
            boutique_name = user.get('boutique_name', 'MAAHIS')
    
    customer_name = customer.get('name', 'Customer') if customer else 'Customer'
    order_number = order.get('order_number', f"ORD-{order_id[-6:].upper()}")
    delivery_date = order.get('delivery_date')
    delivery_str = delivery_date.strftime('%d %b %Y') if delivery_date else 'TBD'
    
    customer_id = order.get('customer_id')
    measurements = None
    if customer_id:
        measurements = await db.measurements.find_one({"customer_id": customer_id})
        if not measurements:
            try:
                measurements = await db.measurements.find_one({"customer_id": ObjectId(customer_id)})
            except:
                pass
    
    measurements_text = ""
    if measurements:
        top = measurements.get('top_measurements', {})
        bottom = measurements.get('bottom_measurements', {})
        
        if top:
            measurements_text += "\n*TOP MEASUREMENTS:*\n"
            labels = {'full_length': 'Full Length', 'shoulder': 'Shoulder', 'upper_chest': 'Upper Chest', 'bust': 'Bust', 'waist': 'Waist', 'front_deep': 'Front Deep', 'back_deep': 'Back Deep', 'sleeve_length': 'Sleeve Length', 'sleeve_round': 'Sleeve Around', 'arm_hole': 'Arm Hole', 'biceps': 'Biceps', 'seat_round': 'Seat Round'}
            for key, label in labels.items():
                val = top.get(key, 0)
                if val and float(val) > 0:
                    measurements_text += f"- {label}: {val}\"\n"
        
        if bottom:
            measurements_text += "\n*BOTTOM MEASUREMENTS:*\n"
            labels = {'length': 'Length', 'hip_round': 'Hip Round', 'thighs': 'Thighs', 'knees': 'Knees', 'ankle': 'Ankle'}
            for key, label in labels.items():
                val = bottom.get(key, 0)
                if val and float(val) > 0:
                    measurements_text += f"- {label}: {val}\"\n"
    
    if not measurements_text:
        measurements_text = "\n_No measurements recorded_\n"
    
    message = f"""*WORK ORDER - {boutique_name}*
================
*Order #:* {order_number}
*Customer:* {customer_name}
*Type:* {order.get('order_type', 'N/A')}
*Delivery:* {delivery_str}
================
{measurements_text}
================
*Notes:* {order.get('description', '') or order.get('voice_instructions', '') or 'None'}

_From {boutique_name}_
"""
    
    encoded_message = urllib.parse.quote(message)
    whatsapp_url = f"https://wa.me/?text={encoded_message}"
    
    return {"url": whatsapp_url, "message": message}

@api_router.get("/whatsapp/order-confirmation/{order_id}")
async def get_whatsapp_order_confirmation(order_id: str):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    customer = await db.customers.find_one({"_id": ObjectId(order['customer_id'])})
    payment = await db.payments.find_one({"order_id": order_id})
    
    boutique_name = "MAAHIS"
    if order.get('user_id'):
        user = await db.users.find_one({"_id": ObjectId(order['user_id'])})
        if user:
            boutique_name = user.get('boutique_name', 'MAAHIS')
    
    customer_name = customer.get('name', 'Customer') if customer else 'Customer'
    customer_phone = customer.get('phone', '') if customer else ''
    
    message = f"""*{boutique_name}*
================
*Order Confirmation*

Customer: {customer_name}
Order Type: {order.get('order_type', 'N/A')}
Delivery: {order.get('delivery_date', datetime.utcnow()).strftime('%d %b %Y')}
"""
    
    if payment:
        message += f"""
Amount: Rs.{payment.get('final_amount', 0):.0f}
Advance: Rs.{payment.get('advance_paid', 0):.0f}
Balance: Rs.{payment.get('balance_amount', 0):.0f}
"""
    
    message += f"""
================
Thank you for choosing *{boutique_name}*!
"""
    
    encoded_message = urllib.parse.quote(message)
    phone = customer_phone.replace(' ', '').replace('-', '').replace('+', '')
    if phone and not phone.startswith('91') and len(phone) == 10:
        phone = '91' + phone
    
    whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
    return {"url": whatsapp_url, "message": message}

@api_router.get("/whatsapp/delivery-reminder/{order_id}")
async def get_whatsapp_delivery_reminder(order_id: str):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    customer = await db.customers.find_one({"_id": ObjectId(order['customer_id'])})
    
    boutique_name = "MAAHIS"
    if order.get('user_id'):
        user = await db.users.find_one({"_id": ObjectId(order['user_id'])})
        if user:
            boutique_name = user.get('boutique_name', 'MAAHIS')
    
    customer_name = customer.get('name', 'Customer') if customer else 'Customer'
    customer_phone = customer.get('phone', '') if customer else ''
    
    message = f"""*{boutique_name}*
================
*Delivery Reminder*

Dear {customer_name},

Your {order.get('order_type', 'order')} is ready for delivery on *{order.get('delivery_date', datetime.utcnow()).strftime('%d %b %Y')}*.

================
Thank you!
"""
    
    encoded_message = urllib.parse.quote(message)
    phone = customer_phone.replace(' ', '').replace('-', '').replace('+', '')
    if phone and not phone.startswith('91') and len(phone) == 10:
        phone = '91' + phone
    
    whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
    return {"url": whatsapp_url, "message": message}

@api_router.get("/whatsapp/balance-reminder/{order_id}")
async def get_whatsapp_balance_reminder(order_id: str):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    customer = await db.customers.find_one({"_id": ObjectId(order['customer_id'])})
    payment = await db.payments.find_one({"order_id": order_id})
    
    boutique_name = "MAAHIS"
    if order.get('user_id'):
        user = await db.users.find_one({"_id": ObjectId(order['user_id'])})
        if user:
            boutique_name = user.get('boutique_name', 'MAAHIS')
    
    customer_name = customer.get('name', 'Customer') if customer else 'Customer'
    customer_phone = customer.get('phone', '') if customer else ''
    balance = payment.get('balance_amount', 0) if payment else 0
    
    message = f"""*{boutique_name}*
================
*Payment Reminder*

Dear {customer_name},

Pending balance: *Rs.{balance:.0f}* for your {order.get('order_type', 'order')}.

================
Thank you!
"""
    
    encoded_message = urllib.parse.quote(message)
    phone = customer_phone.replace(' ', '').replace('-', '').replace('+', '')
    if phone and not phone.startswith('91') and len(phone) == 10:
        phone = '91' + phone
    
    whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
    return {"url": whatsapp_url, "message": message}

# ========================== RESYNC ENDPOINTS ==========================

@api_router.post("/resync-order/{order_id}")
async def resync_order_to_dashboard(order_id: str):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    payment = await db.payments.find_one({"order_id": order_id})
    
    order_number = order.get('order_number') or f"ORD-{order_id[-6:].upper()}"
    customer_name = order.get('customer_name', 'Unknown')
    amount = payment.get('final_amount', 0) if payment else order.get('amount', 0)
    advance_paid = payment.get('advance_paid', 0) if payment else order.get('advance_paid', 0)
    customer_phone = order.get('customer_phone', '')
    order_type = order.get('order_type', '')
    delivery_date = order.get('delivery_date')
    delivery_str = delivery_date.strftime('%d %b %Y') if delivery_date else ''

    result = await notify_dashboard_order_created(
        order_number=order_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        order_type=order_type,
        amount=amount,
        advance_paid=advance_paid,
        delivery_date=delivery_str,
        notes=order.get('description', '') or order.get('voice_instructions', '')
    )
    
    return {
        "order_id": order_id,
        "order_number": order_number,
        "customer_name": customer_name,
        "payload": {"amount": amount, "advance_paid": advance_paid, "status": status},
        "webhook_result": result
    }

@api_router.get("/debug-order/{order_id}")
async def debug_order(order_id: str):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    payment = await db.payments.find_one({"order_id": order_id})
    
    return {
        "order_id": order_id,
        "order_number": order.get('order_number'),
        "customer_name": order.get('customer_name'),
        "status": order.get('status'),
        "amount_in_order": order.get('amount', 0),
        "advance_in_order": order.get('advance_paid', 0),
        "payment": {
            "final_amount": payment.get('final_amount', 0),
            "advance_paid": payment.get('advance_paid', 0),
            "balance": payment.get('balance_amount', 0),
            "status": payment.get('payment_status')
        } if payment else None
    }

@api_router.post("/resync-all-orders")
async def resync_all_orders(user_id: str):
    orders = await db.orders.find({"user_id": user_id}).to_list(1000)
    results = []
    
    for order in orders:
        order_id = str(order['_id'])
        payment = await db.payments.find_one({"order_id": order_id})
        
        order_number = order.get('order_number') or f"ORD-{order_id[-6:].upper()}"
        amount = payment.get('final_amount', 0) if payment else order.get('amount', 0)
        advance = payment.get('advance_paid', 0) if payment else order.get('advance_paid', 0)
        customer_name = order.get('customer_name', '')
        customer_phone = order.get('customer_phone', '')
        order_type = order.get('order_type', '')
        delivery_date = order.get('delivery_date')
        delivery_str = delivery_date.strftime('%d %b %Y') if delivery_date else ''

        result = await notify_dashboard_order_created(
            order_number=order_number,
            customer_name=customer_name,
            customer_phone=customer_phone,
            order_type=order_type,
            amount=amount,
            advance_paid=advance,
            delivery_date=delivery_str,
            notes=order.get('description', '') or order.get('voice_instructions', '')
        )
        
        results.append({
            "order_number": order_number,
            "customer_name": order.get('customer_name', ''),
            "amount": amount,
            "advance": advance,
            "result": result
        })
    
    return {"total_synced": len(results), "results": results}

# ========================== HEALTH CHECK ==========================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "MAAHIS API", "version": "3.0.0"}

# ========================== BACKUP ==========================

class BackupRequest(BaseModel):
    email: str

@api_router.post("/backup/request")
async def request_backup(backup: BackupRequest):
    import json
    
    customers = await db.customers.find().to_list(1000)
    orders = await db.orders.find().to_list(1000)
    measurements = await db.measurements.find().to_list(1000)
    payments = await db.payments.find().to_list(1000)
    
    def serialize(doc):
        doc['_id'] = str(doc.get('_id', ''))
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value.isoformat()
        return doc
    
    return {"success": True, "message": f"Backup contains {len(customers)} customers, {len(orders)} orders"}

# ========================== STAFF MANAGEMENT ==========================

class StaffCreate(BaseModel):
    name: str
    role: str
    boutique_id: str

class StaffAssign(BaseModel):
    staff_id: str
    order_number: str
    customer_name: str
    garment_type: str
    stage: str
    notes: Optional[str] = ""
    boutique_id: str

@api_router.get("/staff/report")
async def get_staff_report(boutique: str):
    all_staff = await db.staff.find({"boutique_id": boutique}).to_list(100)
    
    masters = []
    tailors = []
    
    today_start = datetime.combine(date.today(), datetime.min.time())
    done_today = await db.staff_completed.count_documents({"boutique_id": boutique, "completed_at": {"$gte": today_start}})
    
    for staff in all_staff:
        assignments = await db.staff_assignments.find({"staff_id": str(staff["_id"])}).to_list(50)
        staff_data = {
            "id": str(staff["_id"]),
            "name": staff["name"],
            "role": staff["role"],
            "pieces_in_hand": len(assignments),
            "assignments": [{"id": str(a["_id"]), "order_number": a.get("order_number", ""), "customer_name": a.get("customer_name", ""), "garment_type": a.get("garment_type", ""), "stage": a.get("stage", "Assigned")} for a in assignments]
        }
        if staff["role"] == "master":
            masters.append(staff_data)
        else:
            tailors.append(staff_data)
    
    return {"masters_count": len(masters), "tailors_active": len(tailors), "done_today": done_today, "masters": masters, "tailors": tailors}

@api_router.post("/staff/add")
async def add_staff(staff: StaffCreate):
    staff_doc = {"name": staff.name, "role": staff.role, "boutique_id": staff.boutique_id, "created_at": datetime.utcnow()}
    result = await db.staff.insert_one(staff_doc)
    return {"success": True, "id": str(result.inserted_id)}

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str):
    await db.staff.delete_one({"_id": ObjectId(staff_id)})
    await db.staff_assignments.delete_many({"staff_id": staff_id})
    return {"success": True}

@api_router.post("/staff/assign")
async def assign_work(assignment: StaffAssign):
    assignment_doc = {
        "staff_id": assignment.staff_id,
        "order_number": assignment.order_number,
        "customer_name": assignment.customer_name,
        "garment_type": assignment.garment_type,
        "stage": assignment.stage,
        "notes": assignment.notes,
        "boutique_id": assignment.boutique_id,
        "assigned_at": datetime.utcnow()
    }
    result = await db.staff_assignments.insert_one(assignment_doc)
    return {"success": True, "id": str(result.inserted_id)}

@api_router.delete("/staff/assignment/{assignment_id}")
async def mark_assignment_done(assignment_id: str):
    assignment = await db.staff_assignments.find_one({"_id": ObjectId(assignment_id)})
    if assignment:
        await db.staff_completed.insert_one({**assignment, "completed_at": datetime.utcnow()})
    await db.staff_assignments.delete_one({"_id": ObjectId(assignment_id)})
    return {"success": True}

# ========================== INCLUDE ROUTER & MIDDLEWARE ==========================

app.include_router(api_router)

@app.get("/health")
async def root_health_check():
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
