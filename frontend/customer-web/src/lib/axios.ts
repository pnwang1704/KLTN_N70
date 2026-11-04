import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000',
  timeout: 15000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

export default api;

