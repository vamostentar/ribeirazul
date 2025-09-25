import { api } from './client';

export interface ContactMessage {
  fromName: string;
  fromEmail: string;
  phone?: string;
  body: string;
  context?: any;
}

export interface MessageResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
  };
  error?: string;
  details?: any;
}

/**
 * Send a contact message via the messages service
 * This function sends the message through the API Gateway which proxies to the messages service
 */
export async function sendContactMessage(message: ContactMessage): Promise<MessageResponse> {
  try {
    console.log('[Messages] Sending contact message:', { 
      fromName: message.fromName, 
      fromEmail: message.fromEmail,
      hasPhone: !!message.phone,
      bodyLength: message.body.length 
    });

    const response = await api.post('/api/v1/messages', message);
    
    console.log('[Messages] Message sent successfully:', response.data);
    
    return response.data;
  } catch (error: any) {
    console.error('[Messages] Error sending message:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Extract error message from response
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message ||
                        error.message ||
                        'Falha ao enviar mensagem';
    
    throw new Error(errorMessage);
  }
}

/**
 * Get message by ID (for tracking/confirmation)
 */
export async function getMessageById(id: string): Promise<MessageResponse> {
  try {
    const response = await api.get(`/api/v1/messages/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('[Messages] Error fetching message:', error);
    throw new Error('Falha ao buscar mensagem');
  }
}
