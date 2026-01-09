from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
import base64
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'maahis_smartbook')]

# Create the main app without a prefix
app = FastAPI(title="Maahis SmartBook API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========================== MODELS ==========================

# User Models
class UserLogin(BaseModel):
    username: str
    pin: str

class UserResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    username: Optional[str] = None

# Customer Models
class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    photo: Optional[str] = ""  # Base64 image
    notes: Optional[str] = ""

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

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    """Login with username and PIN"""
    # Fixed credentials as per user requirement
    if credentials.username.upper() == "MAAHIS" and credentials.pin == "101316":
        return UserResponse(
            success=True,
            message="Login successful",
            user_id="admin_001",
            username="MAAHIS"
        )
    return UserResponse(
        success=False,
        message="Invalid username or PIN"
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
        "created_at": datetime.utcnow()
    }
    result = await db.customers.insert_one(customer_doc)
    customer_doc['id'] = str(result.inserted_id)
    del customer_doc['_id'] if '_id' in customer_doc else None
    return CustomerResponse(**customer_doc)

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(search: Optional[str] = None):
    """Get all customers or search by name/phone"""
    query = {}
    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        }
    customers = await db.customers.find(query).sort("created_at", -1).to_list(1000)
    return [CustomerResponse(**serialize_doc(c)) for c in customers]

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str):
    """Get a single customer by ID"""
    try:
        customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return CustomerResponse(**serialize_doc(customer))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, update: CustomerUpdate):
    """Update a customer"""
    try:
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = await db.customers.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
        return CustomerResponse(**serialize_doc(customer))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    """Delete a customer"""
    try:
        result = await db.customers.delete_one({"_id": ObjectId(customer_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        # Also delete related measurements and orders
        await db.measurements.delete_many({"customer_id": customer_id})
        await db.orders.delete_many({"customer_id": customer_id})
        return {"message": "Customer deleted successfully"}
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
    try:
        customer = await db.customers.find_one({"_id": ObjectId(order.customer_id)})
        customer_name = customer.get("name", "") if customer else ""
        customer_phone = customer.get("phone", "") if customer else ""
    except:
        customer_name = ""
        customer_phone = ""
    
    order_doc = {
        "customer_id": order.customer_id,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "measurement_id": order.measurement_id,
        "order_type": order.order_type,
        "description": order.description or "",
        "material_photos": order.material_photos or [],
        "order_date": datetime.fromisoformat(order.order_date.replace('Z', '+00:00')) if order.order_date else datetime.utcnow(),
        "delivery_date": datetime.fromisoformat(order.delivery_date.replace('Z', '+00:00')) if order.delivery_date else datetime.utcnow(),
        "status": "received",
        "voice_instructions": order.voice_instructions or "",
        "auto_created_by_voice": order.auto_created_by_voice or False,
        "created_at": datetime.utcnow()
    }
    result = await db.orders.insert_one(order_doc)
    order_doc['id'] = str(result.inserted_id)
    return OrderResponse(**order_doc)

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all orders with optional filters"""
    query = {}
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
async def get_order(order_id: str):
    """Get a single order"""
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return OrderResponse(**serialize_doc(order))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, update: OrderUpdate):
    """Update an order"""
    try:
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
        
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        return OrderResponse(**serialize_doc(order))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str):
    """Update order status"""
    valid_statuses = ["received", "cutting", "stitching", "trial_ready", "completed", "delivered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    try:
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Status updated successfully", "status": status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    """Delete an order"""
    try:
        result = await db.orders.delete_one({"_id": ObjectId(order_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        # Also delete related payments
        await db.payments.delete_many({"order_id": order_id})
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

# ========================== DASHBOARD ROUTES ==========================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    from datetime import timedelta
    
    total_customers = await db.customers.count_documents({})
    
    # Pending orders (not delivered)
    pending_orders = await db.orders.count_documents({
        "status": {"$nin": ["delivered", "completed"]}
    })
    
    # Delivery due today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    delivery_today = await db.orders.count_documents({
        "delivery_date": {"$gte": today, "$lt": tomorrow},
        "status": {"$ne": "delivered"}
    })
    
    # Delivery in next 2 days
    day_after_tomorrow = today + timedelta(days=3)
    delivery_in_2_days = await db.orders.count_documents({
        "delivery_date": {"$gte": tomorrow, "$lt": day_after_tomorrow},
        "status": {"$ne": "delivered"}
    })
    
    return DashboardStats(
        total_customers=total_customers,
        pending_orders=pending_orders,
        delivery_today=delivery_today,
        delivery_in_2_days=delivery_in_2_days
    )

# ========================== SEARCH ROUTES ==========================

@api_router.get("/search", response_model=List[SearchResult])
async def global_search(q: str):
    """Global search across customers and orders"""
    results = []
    
    # Search customers
    customers = await db.customers.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}}
        ]
    }).limit(10).to_list(10)
    
    for c in customers:
        results.append(SearchResult(
            type="customer",
            id=str(c['_id']),
            title=c['name'],
            subtitle=c['phone'],
            extra=c.get('address', '')
        ))
    
    # Search orders
    orders = await db.orders.find({
        "$or": [
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"customer_phone": {"$regex": q, "$options": "i"}},
            {"order_type": {"$regex": q, "$options": "i"}}
        ]
    }).limit(10).to_list(10)
    
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
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        # Decode base64 audio
        audio_data = base64.b64decode(request.audio_base64)
        
        # Save temporarily
        temp_path = f"/tmp/audio_{uuid.uuid4()}.{request.format}"
        with open(temp_path, 'wb') as f:
            f.write(audio_data)
        
        # Use OpenAI Whisper
        client = openai.OpenAI(
            api_key=emergent_key,
            base_url="https://emergent.sh/api/v1"
        )
        
        with open(temp_path, 'rb') as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        # Clean up
        os.remove(temp_path)
        
        return VoiceTranscriptionResponse(
            text=transcription.text,
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
        
        customer_name = customer.get('name', 'Customer') if customer else 'Customer'
        customer_phone = customer.get('phone', '') if customer else ''
        
        # Format message
        message = f"""🌟 *Maahis Designer Boutique* 🌟
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
        
        message += """
━━━━━━━━━━━━━━━━━━━
Thank you for choosing Maahis! ✨
"Where Elegance Meets Perfection"
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
        
        customer_name = customer.get('name', 'Customer') if customer else 'Customer'
        customer_phone = customer.get('phone', '') if customer else ''
        
        message = f"""🌟 *Maahis Designer Boutique* 🌟
━━━━━━━━━━━━━━━━━━━
*Delivery Reminder*

Dear {customer_name},

This is a friendly reminder that your {order.get('order_type', 'order')} is scheduled for delivery on *{order.get('delivery_date', datetime.utcnow()).strftime('%d %b %Y')}*.

Please ensure availability for pickup/delivery.

━━━━━━━━━━━━━━━━━━━
Thank you! ✨
*Maahis Designer Boutique*
"Where Elegance Meets Perfection"
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
        
        customer_name = customer.get('name', 'Customer') if customer else 'Customer'
        customer_phone = customer.get('phone', '') if customer else ''
        balance = payment.get('balance_amount', 0) if payment else 0
        
        message = f"""🌟 *Maahis Designer Boutique* 🌟
━━━━━━━━━━━━━━━━━━━
*Payment Reminder*

Dear {customer_name},

This is a gentle reminder regarding your pending balance of *₹{balance:.2f}* for your {order.get('order_type', 'order')}.

Kindly clear the balance at your earliest convenience.

━━━━━━━━━━━━━━━━━━━
Thank you! ✨
*Maahis Designer Boutique*
"Where Elegance Meets Perfection"
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
    return {"status": "healthy", "service": "Maahis SmartBook API"}

# Include the router in the main app
app.include_router(api_router)

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
