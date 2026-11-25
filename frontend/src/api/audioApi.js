import apiClient from './client';

export const transcribeAudio = async (file, language = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (language) {
    formData.append('language', language);
  }
  const response = await apiClient.post('/api/v1/audio/transcribe', formData);
  return response.data;
};

export const summarizeAudio = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/v1/audio/summarize', formData);
  return response.data;
};

export const askAudioQuestion = async (file, question) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('question', question);
  const response = await apiClient.post('/api/v1/audio/ask', formData);
  return response.data;
};

