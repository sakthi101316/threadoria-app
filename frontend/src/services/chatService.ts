// Claude AI Chat Service - Powered by Threadoria AI
import Constants from 'expo-constants';

const getBackendUrl = () => {
  return Constants.expoConfig?.extra?.backendUrl || 
         process.env.EXPO_PUBLIC_BACKEND_URL || 
         '';
};

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
    const baseUrl = getBackendUrl();
    const response = await fetch(`${baseUrl}/api/claude/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phone.startsWith('+') ? phone.replace('+', '') : phone,
        message: message,
        is_owner: isOwner,
      }),
    });

    const data: ChatResponse = await response.json();

    if (data.status === 'success') {
      return { success: true, reply: data.reply };
    } else {
      return { success: false, reply: data.reply || '', error: 'Failed to get response' };
    }
  } catch (error: any) {
    console.error('Claude Chat API Error:', error);
    return { success: false, reply: '', error: error.message || 'Connection failed' };
  }
}

export async function clearChatHistory(phone: string): Promise<boolean> {
  try {
    const baseUrl = getBackendUrl();
    const response = await fetch(`${baseUrl}/api/claude/chat/clear?phone=${phone}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Clear chat error:', error);
    return false;
  }
}
