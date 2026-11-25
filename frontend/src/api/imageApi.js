import apiClient from './client';

export const generateCaption = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/v1/image/caption', formData);
  return response.data;
};

export const answerQuestion = async (file, question) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('question', question);
  const response = await apiClient.post('/api/v1/image/ask', formData);
  return response.data;
};

export const analyzeImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/v1/image/analyze', formData);
  return response.data;
};

