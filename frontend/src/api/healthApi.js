import apiClient from './client';

export const getHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const getStatus = async () => {
  const response = await apiClient.get('/api/v1/status');
  return response.data;
};

