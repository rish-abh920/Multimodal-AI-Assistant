import apiClient from './client';

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/v1/documents/upload', formData);
  return response.data;
};

export const summarizeDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/v1/documents/summarize', formData);
  return response.data;
};

export const askDocumentQuestion = async (file, question, top_k = 3) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('question', question);
  formData.append('top_k', top_k);
  const response = await apiClient.post('/api/v1/documents/ask', formData);
  return response.data;
};

