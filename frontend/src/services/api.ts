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
  async login(username: string, pin: string) {
    return this.request<{ success: boolean; message: string; user_id?: string; username?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin }),
    });
  }

  // Customers
  async getCustomers(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
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
  async getOrders(params?: { status?: string; customer_id?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.customer_id) query.append('customer_id', params.customer_id);
    if (params?.search) query.append('search', params.search);
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
  async getPaymentAnalytics(period: string = 'all') {
    return this.request<{
      total_revenue: number;
      total_collected: number;
      total_pending: number;
      paid_count: number;
      partial_count: number;
      unpaid_count: number;
      payments: any[];
    }>(`/payments/analytics?period=${period}`);
  }

  async getAllPayments(status?: string) {
    const query = status ? `?status=${status}` : '';
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
  async getDashboardStats() {
    return this.request<{
      total_customers: number;
      pending_orders: number;
      delivery_today: number;
      delivery_in_2_days: number;
    }>('/dashboard/stats');
  }

  // Search
  async globalSearch(query: string) {
    return this.request<any[]>(`/search?q=${encodeURIComponent(query)}`);
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
}

export const api = new ApiService();
