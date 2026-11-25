import apiClient from './client';

export const summarizeText = async ({ text, max_length = 180, min_length = 30 }) => {
  const response = await apiClient.post('/api/v1/text/summarize', {
    text,
    max_length,
    min_length,
  });
  return response.data;
};

export const analyzeText = async ({ text, question = null, rewrite_style = 'concise' }) => {
  const response = await apiClient.post('/api/v1/text/analyze', {
    text,
    question,
    rewrite_style,
  });
  return response.data;
};
