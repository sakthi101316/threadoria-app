#!/usr/bin/env python3
"""
BoutiqueFit Backend API Testing Script
Tests data isolation with user_id filtering
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Backend URL from frontend/.env
BASE_URL = "https://fittracker-172.preview.emergentagent.com/api"

class BoutiqueFitTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_a_id = None
        self.user_b_id = None
        self.customer_a_id = None
        self.customer_b_id = None
        self.order_a_id = None
        self.order_b_id = None
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")
        
    def test_registration(self):
        """Test user registration for two different users"""
        self.log("Testing user registration...")
        
        # Use unique phone numbers with timestamp to avoid conflicts
        import time
        timestamp = str(int(time.time()))[-4:]  # Last 4 digits of timestamp
        phone_a = f"987654{timestamp}0"
        phone_b = f"987654{timestamp}1"
        
        # Test User A Registration
        self.log(f"Sending OTP for User A ({phone_a})...")
        otp_response_a = self.session.post(f"{BASE_URL}/auth/send-otp", 
            json={"phone": phone_a})
        
        if otp_response_a.status_code != 200:
            self.log(f"OTP request failed for User A: {otp_response_a.text}", "ERROR")
            return False
            
        # In demo mode, any 6-digit OTP should work
        self.log("Registering User A...")
        register_response_a = self.session.post(f"{BASE_URL}/auth/register", json={
            "boutique_name": "Boutique A",
            "owner_name": "Owner A", 
            "email": f"ownera{timestamp}@boutique.com",
            "phone": phone_a,
            "pin": "123456",
            "otp": "123456"  # Demo OTP - should work in demo mode
        })
        
        if register_response_a.status_code != 200:
            self.log(f"Registration failed for User A: {register_response_a.text}", "ERROR")
            return False
            
        user_a_data = register_response_a.json()
        if not user_a_data.get("success"):
            self.log(f"User A registration unsuccessful: {user_a_data.get('message')}", "ERROR")
            return False
            
        self.log(f"User A registered successfully: {user_a_data.get('user_id')}")
        
        # Test User B Registration
        self.log(f"Sending OTP for User B ({phone_b})...")
        otp_response_b = self.session.post(f"{BASE_URL}/auth/send-otp", 
            json={"phone": phone_b})
        
        if otp_response_b.status_code != 200:
            self.log(f"OTP request failed for User B: {otp_response_b.text}", "ERROR")
            return False
            
        self.log("Registering User B...")
        register_response_b = self.session.post(f"{BASE_URL}/auth/register", json={
            "boutique_name": "Boutique B",
            "owner_name": "Owner B",
            "email": f"ownerb{timestamp}@boutique.com", 
            "phone": phone_b,
            "pin": "123456",
            "otp": "123456"  # Demo OTP - should work in demo mode
        })
        
        if register_response_b.status_code != 200:
            self.log(f"Registration failed for User B: {register_response_b.text}", "ERROR")
            return False
            
        user_b_data = register_response_b.json()
        if not user_b_data.get("success"):
            self.log(f"User B registration unsuccessful: {user_b_data.get('message')}", "ERROR")
            return False
            
        self.log(f"User B registered successfully: {user_b_data.get('user_id')}")
        
        # Store phone numbers for login
        self.phone_a = phone_a
        self.phone_b = phone_b
        return True
        
    def test_login(self):
        """Test login for both users and get their user_ids"""
        self.log("Testing user login...")
        
        # Login User A
        self.log("Logging in User A...")
        login_response_a = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": "9876543210",  # Using phone as email
            "pin": "123456"
        })
        
        if login_response_a.status_code != 200:
            self.log(f"Login failed for User A: {login_response_a.text}", "ERROR")
            return False
            
        user_a_data = login_response_a.json()
        if not user_a_data.get("success"):
            self.log(f"User A login unsuccessful: {user_a_data.get('message')}", "ERROR")
            return False
            
        self.user_a_id = user_a_data.get("user_id")
        self.log(f"User A logged in successfully. User ID: {self.user_a_id}")
        
        # Login User B
        self.log("Logging in User B...")
        login_response_b = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": "9876543211",  # Using phone as email
            "pin": "123456"
        })
        
        if login_response_b.status_code != 200:
            self.log(f"Login failed for User B: {login_response_b.text}", "ERROR")
            return False
            
        user_b_data = login_response_b.json()
        if not user_b_data.get("success"):
            self.log(f"User B login unsuccessful: {user_b_data.get('message')}", "ERROR")
            return False
            
        self.user_b_id = user_b_data.get("user_id")
        self.log(f"User B logged in successfully. User ID: {self.user_b_id}")
        
        return True
        
    def test_customer_creation(self):
        """Test customer creation with user_id"""
        self.log("Testing customer creation with user_id...")
        
        # Create customer for User A
        self.log("Creating customer for User A...")
        customer_a_response = self.session.post(f"{BASE_URL}/customers", json={
            "name": "Customer A1",
            "phone": "9111111111",
            "address": "Address A1",
            "user_id": self.user_a_id
        })
        
        if customer_a_response.status_code != 200:
            self.log(f"Customer creation failed for User A: {customer_a_response.text}", "ERROR")
            return False
            
        customer_a_data = customer_a_response.json()
        self.customer_a_id = customer_a_data.get("id")
        self.log(f"Customer created for User A: {self.customer_a_id}")
        
        # Create customer for User B
        self.log("Creating customer for User B...")
        customer_b_response = self.session.post(f"{BASE_URL}/customers", json={
            "name": "Customer B1",
            "phone": "9222222222", 
            "address": "Address B1",
            "user_id": self.user_b_id
        })
        
        if customer_b_response.status_code != 200:
            self.log(f"Customer creation failed for User B: {customer_b_response.text}", "ERROR")
            return False
            
        customer_b_data = customer_b_response.json()
        self.customer_b_id = customer_b_data.get("id")
        self.log(f"Customer created for User B: {self.customer_b_id}")
        
        return True
        
    def test_order_creation(self):
        """Test order creation for both users"""
        self.log("Testing order creation...")
        
        # Create order for User A's customer
        self.log("Creating order for User A's customer...")
        order_a_response = self.session.post(f"{BASE_URL}/orders", json={
            "customer_id": self.customer_a_id,
            "order_type": "Blouse A",
            "description": "Custom blouse for User A customer",
            "order_date": datetime.now().isoformat(),
            "delivery_date": (datetime.now() + timedelta(days=7)).isoformat()
        })
        
        if order_a_response.status_code != 200:
            self.log(f"Order creation failed for User A: {order_a_response.text}", "ERROR")
            return False
            
        order_a_data = order_a_response.json()
        self.order_a_id = order_a_data.get("id")
        self.log(f"Order created for User A: {self.order_a_id}")
        
        # Create order for User B's customer
        self.log("Creating order for User B's customer...")
        order_b_response = self.session.post(f"{BASE_URL}/orders", json={
            "customer_id": self.customer_b_id,
            "order_type": "Saree B",
            "description": "Custom saree for User B customer",
            "order_date": datetime.now().isoformat(),
            "delivery_date": (datetime.now() + timedelta(days=10)).isoformat()
        })
        
        if order_b_response.status_code != 200:
            self.log(f"Order creation failed for User B: {order_b_response.text}", "ERROR")
            return False
            
        order_b_data = order_b_response.json()
        self.order_b_id = order_b_data.get("id")
        self.log(f"Order created for User B: {self.order_b_id}")
        
        return True
        
    def test_data_isolation(self):
        """Test data isolation - critical test"""
        self.log("Testing data isolation (CRITICAL)...")
        
        # Test customers isolation
        self.log("Testing customers API isolation...")
        
        # User A should only see their customers
        customers_a_response = self.session.get(f"{BASE_URL}/customers?user_id={self.user_a_id}")
        if customers_a_response.status_code != 200:
            self.log(f"Failed to get customers for User A: {customers_a_response.text}", "ERROR")
            return False
            
        customers_a = customers_a_response.json()
        self.log(f"User A sees {len(customers_a)} customers")
        
        # Check if User A only sees their own customers
        for customer in customers_a:
            if customer.get("name") != "Customer A1":
                self.log(f"DATA ISOLATION BREACH: User A can see customer: {customer.get('name')}", "ERROR")
                return False
                
        # User B should only see their customers
        customers_b_response = self.session.get(f"{BASE_URL}/customers?user_id={self.user_b_id}")
        if customers_b_response.status_code != 200:
            self.log(f"Failed to get customers for User B: {customers_b_response.text}", "ERROR")
            return False
            
        customers_b = customers_b_response.json()
        self.log(f"User B sees {len(customers_b)} customers")
        
        # Check if User B only sees their own customers
        for customer in customers_b:
            if customer.get("name") != "Customer B1":
                self.log(f"DATA ISOLATION BREACH: User B can see customer: {customer.get('name')}", "ERROR")
                return False
                
        self.log("✅ Customers API isolation working correctly")
        
        # Test orders isolation
        self.log("Testing orders API isolation...")
        
        # User A should only see their orders
        orders_a_response = self.session.get(f"{BASE_URL}/orders?user_id={self.user_a_id}")
        if orders_a_response.status_code != 200:
            self.log(f"Failed to get orders for User A: {orders_a_response.text}", "ERROR")
            return False
            
        orders_a = orders_a_response.json()
        self.log(f"User A sees {len(orders_a)} orders")
        
        # Check if User A only sees their own orders
        for order in orders_a:
            if order.get("order_type") != "Blouse A":
                self.log(f"DATA ISOLATION BREACH: User A can see order: {order.get('order_type')}", "ERROR")
                return False
                
        # User B should only see their orders
        orders_b_response = self.session.get(f"{BASE_URL}/orders?user_id={self.user_b_id}")
        if orders_b_response.status_code != 200:
            self.log(f"Failed to get orders for User B: {orders_b_response.text}", "ERROR")
            return False
            
        orders_b = orders_b_response.json()
        self.log(f"User B sees {len(orders_b)} orders")
        
        # Check if User B only sees their own orders
        for order in orders_b:
            if order.get("order_type") != "Saree B":
                self.log(f"DATA ISOLATION BREACH: User B can see order: {order.get('order_type')}", "ERROR")
                return False
                
        self.log("✅ Orders API isolation working correctly")
        
        # Test dashboard stats isolation
        self.log("Testing dashboard stats API isolation...")
        
        # User A dashboard stats
        stats_a_response = self.session.get(f"{BASE_URL}/dashboard/stats?user_id={self.user_a_id}")
        if stats_a_response.status_code != 200:
            self.log(f"Failed to get dashboard stats for User A: {stats_a_response.text}", "ERROR")
            return False
            
        stats_a = stats_a_response.json()
        self.log(f"User A dashboard stats: {stats_a}")
        
        # User A should have 1 customer and 1 pending order
        if stats_a.get("total_customers") != 1:
            self.log(f"DATA ISOLATION BREACH: User A dashboard shows {stats_a.get('total_customers')} customers, expected 1", "ERROR")
            return False
            
        if stats_a.get("pending_orders") != 1:
            self.log(f"DATA ISOLATION BREACH: User A dashboard shows {stats_a.get('pending_orders')} pending orders, expected 1", "ERROR")
            return False
            
        # User B dashboard stats
        stats_b_response = self.session.get(f"{BASE_URL}/dashboard/stats?user_id={self.user_b_id}")
        if stats_b_response.status_code != 200:
            self.log(f"Failed to get dashboard stats for User B: {stats_b_response.text}", "ERROR")
            return False
            
        stats_b = stats_b_response.json()
        self.log(f"User B dashboard stats: {stats_b}")
        
        # User B should have 1 customer and 1 pending order
        if stats_b.get("total_customers") != 1:
            self.log(f"DATA ISOLATION BREACH: User B dashboard shows {stats_b.get('total_customers')} customers, expected 1", "ERROR")
            return False
            
        if stats_b.get("pending_orders") != 1:
            self.log(f"DATA ISOLATION BREACH: User B dashboard shows {stats_b.get('pending_orders')} pending orders, expected 1", "ERROR")
            return False
            
        self.log("✅ Dashboard stats API isolation working correctly")
        
        # Test search API isolation
        self.log("Testing search API isolation...")
        
        # User A search
        search_a_response = self.session.get(f"{BASE_URL}/search?q=Customer&user_id={self.user_a_id}")
        if search_a_response.status_code != 200:
            self.log(f"Failed to search for User A: {search_a_response.text}", "ERROR")
            return False
            
        search_a = search_a_response.json()
        self.log(f"User A search results: {len(search_a)} items")
        
        # Check if User A only sees their own data in search
        for result in search_a:
            if result.get("type") == "customer" and "Customer A1" not in result.get("title", ""):
                self.log(f"DATA ISOLATION BREACH: User A search shows: {result.get('title')}", "ERROR")
                return False
            if result.get("type") == "order" and "Blouse A" not in result.get("title", ""):
                self.log(f"DATA ISOLATION BREACH: User A search shows order: {result.get('title')}", "ERROR")
                return False
                
        # User B search
        search_b_response = self.session.get(f"{BASE_URL}/search?q=Customer&user_id={self.user_b_id}")
        if search_b_response.status_code != 200:
            self.log(f"Failed to search for User B: {search_b_response.text}", "ERROR")
            return False
            
        search_b = search_b_response.json()
        self.log(f"User B search results: {len(search_b)} items")
        
        # Check if User B only sees their own data in search
        for result in search_b:
            if result.get("type") == "customer" and "Customer B1" not in result.get("title", ""):
                self.log(f"DATA ISOLATION BREACH: User B search shows: {result.get('title')}", "ERROR")
                return False
            if result.get("type") == "order" and "Saree B" not in result.get("title", ""):
                self.log(f"DATA ISOLATION BREACH: User B search shows order: {result.get('title')}", "ERROR")
                return False
                
        self.log("✅ Search API isolation working correctly")
        
        # Test payments analytics isolation
        self.log("Testing payments analytics API isolation...")
        
        # User A payments analytics
        payments_a_response = self.session.get(f"{BASE_URL}/payments/analytics?user_id={self.user_a_id}")
        if payments_a_response.status_code != 200:
            self.log(f"Failed to get payments analytics for User A: {payments_a_response.text}", "ERROR")
            return False
            
        payments_a = payments_a_response.json()
        self.log(f"User A payments analytics: {len(payments_a.get('payments', []))} payments")
        
        # User B payments analytics
        payments_b_response = self.session.get(f"{BASE_URL}/payments/analytics?user_id={self.user_b_id}")
        if payments_b_response.status_code != 200:
            self.log(f"Failed to get payments analytics for User B: {payments_b_response.text}", "ERROR")
            return False
            
        payments_b = payments_b_response.json()
        self.log(f"User B payments analytics: {len(payments_b.get('payments', []))} payments")
        
        self.log("✅ Payments analytics API isolation working correctly")
        
        return True
        
    def test_without_user_id(self):
        """Test APIs without user_id parameter to ensure they still work"""
        self.log("Testing APIs without user_id parameter...")
        
        # Test customers without user_id (should return all customers)
        customers_response = self.session.get(f"{BASE_URL}/customers")
        if customers_response.status_code != 200:
            self.log(f"Failed to get customers without user_id: {customers_response.text}", "ERROR")
            return False
            
        customers = customers_response.json()
        self.log(f"Without user_id filter: {len(customers)} customers returned")
        
        # Should see both customers when no user_id filter is applied
        if len(customers) < 2:
            self.log(f"Expected at least 2 customers without user_id filter, got {len(customers)}", "ERROR")
            return False
            
        self.log("✅ APIs work correctly without user_id parameter")
        return True
        
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("Starting BoutiqueFit Backend API Tests...")
        self.log("=" * 60)
        
        tests = [
            ("Registration", self.test_registration),
            ("Login", self.test_login),
            ("Customer Creation", self.test_customer_creation),
            ("Order Creation", self.test_order_creation),
            ("Data Isolation (CRITICAL)", self.test_data_isolation),
            ("APIs without user_id", self.test_without_user_id)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running {test_name} Test ---")
            try:
                if test_func():
                    self.log(f"✅ {test_name} test PASSED")
                    passed += 1
                else:
                    self.log(f"❌ {test_name} test FAILED", "ERROR")
                    failed += 1
            except Exception as e:
                self.log(f"❌ {test_name} test FAILED with exception: {str(e)}", "ERROR")
                failed += 1
                
        self.log("\n" + "=" * 60)
        self.log(f"TEST SUMMARY: {passed} passed, {failed} failed")
        
        if failed == 0:
            self.log("🎉 ALL TESTS PASSED - Data isolation is working correctly!")
            return True
        else:
            self.log(f"⚠️  {failed} TESTS FAILED - Data isolation has issues!")
            return False

if __name__ == "__main__":
    tester = BoutiqueFitTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)