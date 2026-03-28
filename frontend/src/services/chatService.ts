// Antigravity AI Chat Service
const CHAT_API_URL = 'https://prosternal-strangerlike-lani.ngrok-free.dev/api/chat';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatResponse {
  status: string;
  reply: string;
}

export async function sendChatMessage(
  phone: string,
  message: string,
  isOwner: boolean
): Promise<{ success: boolean; reply: string; error?: string }> {
  try {
    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phone.startsWith('+') ? phone : `+91${phone}`,
        message: message,
        is_owner: isOwner,
      }),
    });

    const data: ChatResponse = await response.json();

    if (data.status === 'success') {
      return { success: true, reply: data.reply };
    } else {
      return { success: false, reply: '', error: 'Failed to get response' };
    }
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return { success: false, reply: '', error: error.message || 'Connection failed' };
  }
}
