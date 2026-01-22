const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE}/api`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Auth
  async login(email: string, pin: string) {
    return this.request<{ success: boolean; message: string; user_id?: string; boutique_name?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, pin }),
    });
  }

  // Registration
  async sendOTP(phone: string) {
    return this.request<{ success: boolean; message: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async register(data: {
    boutique_name: string;
    owner_name: string;
    email: string;
    phone: string;
    pin: string;
    otp: string;
  }) {
    return this.request<{ success: boolean; message: string; user_id?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Customers
  async getCustomers(search?: string, userId?: string) {
    let query = '';
    const params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (userId) params.push(`user_id=${encodeURIComponent(userId)}`);
    if (params.length > 0) query = '?' + params.join('&');
    return this.request<any[]>(`/customers${query}`);
  }

  async getCustomer(id: string) {
    return this.request<any>(`/customers/${id}`);
  }

  async createCustomer(data: any) {
    return this.request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: any) {
    return this.request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string) {
    return this.request<any>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Measurements
  async getCustomerMeasurements(customerId: string) {
    return this.request<any[]>(`/measurements/customer/${customerId}`);
  }

  async getMeasurement(id: string) {
    return this.request<any>(`/measurements/${id}`);
  }

  async createMeasurement(data: any) {
    return this.request<any>('/measurements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMeasurement(id: string, data: any) {
    return this.request<any>(`/measurements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMeasurement(id: string) {
    return this.request<any>(`/measurements/${id}`, {
      method: 'DELETE',
    });
  }

  // Orders
  async getOrders(params?: { status?: string; customer_id?: string; search?: string; user_id?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.customer_id) query.append('customer_id', params.customer_id);
    if (params?.search) query.append('search', params.search);
    if (params?.user_id) query.append('user_id', params.user_id);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/orders${queryStr}`);
  }

  async getOrder(id: string) {
    return this.request<any>(`/orders/${id}`);
  }

  async createOrder(data: any) {
    return this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrder(id: string, data: any) {
    return this.request<any>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request<any>(`/orders/${id}/status?status=${status}`, {
      method: 'PUT',
    });
  }

  async deleteOrder(id: string) {
    return this.request<any>(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Payments
  async getOrderPayment(orderId: string) {
    return this.request<any>(`/payments/order/${orderId}`);
  }

  async createPayment(data: any) {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayment(id: string, data: any) {
    return this.request<any>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Payment Analytics
  async getPaymentAnalytics(period: string = 'all', userId?: string) {
    let query = `?period=${period}`;
    if (userId) query += `&user_id=${encodeURIComponent(userId)}`;
    return this.request<{
      total_revenue: number;
      total_collected: number;
      total_pending: number;
      paid_count: number;
      partial_count: number;
      unpaid_count: number;
      payments: any[];
    }>(`/payments/analytics${query}`);
  }

  async getAllPayments(status?: string, userId?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (userId) params.append('user_id', userId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/payments/all${query}`);
  }

  async recordQRPayment(orderId: string, amount: number) {
    return this.request<{ success: boolean; message: string; new_balance: number }>(
      `/payments/record-payment?order_id=${orderId}&amount=${amount}`,
      { method: 'POST' }
    );
  }

  async getWhatsAppPaymentReceived(orderId: string, amount: number) {
    return this.request<{ url: string; message: string }>(
      `/whatsapp/payment-received/${orderId}?amount=${amount}`
    );
  }

  // Dashboard
  async getDashboardStats(userId?: string) {
    const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return this.request<{
      total_customers: number;
      pending_orders: number;
      delivery_today: number;
      delivery_in_2_days: number;
    }>(`/dashboard/stats${query}`);
  }

  // Search
  async globalSearch(query: string, userId?: string) {
    let url = `/search?q=${encodeURIComponent(query)}`;
    if (userId) url += `&user_id=${encodeURIComponent(userId)}`;
    return this.request<any[]>(url);
  }

  // Voice transcription
  async transcribeVoice(audioBase64: string, format: string = 'wav') {
    return this.request<{ text: string; success: boolean }>('/voice/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audio_base64: audioBase64, format }),
    });
  }

  // WhatsApp
  async getWhatsAppOrderConfirmation(orderId: string) {
    return this.request<{ url: string; message: string }>(`/whatsapp/order-confirmation/${orderId}`);
  }

  async getWhatsAppDeliveryReminder(orderId: string) {
    return this.request<{ url: string; message: string }>(`/whatsapp/delivery-reminder/${orderId}`);
  }

  async getWhatsAppBalanceReminder(orderId: string) {
    return this.request<{ url: string; message: string }>(`/whatsapp/balance-reminder/${orderId}`);
  }

  // Backup
  async requestBackup(email: string) {
    return this.request<{ success: boolean; message: string }>('/backup/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
}

export const api = new ApiService();
