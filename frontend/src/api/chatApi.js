import apiClient from './client';

export const sendChatMessage = async ({
  file = null,
  prompt = '',
  text_input = '',
  sessionId = null,
  action = 'auto',
}) => {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (prompt) {
    formData.append('prompt', prompt);
  }
  if (text_input) {
    formData.append('text_input', text_input);
  }
  if (sessionId) {
    formData.append('session_id', sessionId);
  }
  if (action) {
    formData.append('action', action);
  }

  const response = await apiClient.post('/api/v1/chat', formData);
  return response.data;
};

export const getChatHistory = async (sessionId) => {
  const response = await apiClient.get(`/api/v1/chat/history/${sessionId}`);
  return response.data;
};

export const clearChatSession = async (sessionId) => {
  const response = await apiClient.delete(`/api/v1/chat/session/${sessionId}`);
  return response.data;
};
