import { useMutation } from '@tanstack/react-query';
import apiClient from './client';
import { useAuthStore } from '../stores/authStore';

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiClient.post<AuthResponse>('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.refreshToken, data.user);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const res = await apiClient.post<AuthResponse>('/auth/register', data);
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.refreshToken, data.user);
    },
  });
}
