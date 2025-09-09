import axios from 'axios';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: `http://gfj-backend:8081/api`,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('user_details') 
      ? JSON.parse(localStorage.getItem('user_details')).token 
      : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log the request for debugging
    console.log(`[${new Date().toISOString()}] Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[${new Date().toISOString()}] Received ${response.status} from: ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('Response error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });
    
    // Don't redirect on 401 during login attempts
    // Let the login component handle the error
    return Promise.reject(error);
  }
);

export default apiClient; 