import axios from 'axios';

// Tự động phân biệt môi trường: Khi chạy ở Localhost -> dùng http://localhost:5000/api/v1
// Khi deploy Vercel -> dùng biến VITE_API_URL (Render backend)
const getBaseURL = () => {
  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );

  if (isLocalhost) {
    return 'http://localhost:5000/api/v1';
  }

  let rawUrl = import.meta.env.VITE_API_URL;
  if (!rawUrl || !rawUrl.trim()) {
    return 'http://localhost:5000/api/v1';
  }
  rawUrl = rawUrl.trim().replace(/\/+$/, '');
  if (!rawUrl.endsWith('/api/v1')) {
    return `${rawUrl}/api/v1`;
  }
  return rawUrl;
};

// Khởi tạo instance Axios với đường dẫn chuẩn hóa
const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // Tăng lên 30 giây để tránh bị ngắt khi Render cold-start
});

// Middleware chặn trước khi gửi đi (Request Interceptor) để đính kèm Token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Middleware xử lý dữ liệu phản hồi (Response Interceptor) để tự động đăng xuất khi gặp lỗi 401
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Phiên làm việc hết hạn hoặc tài khoản không tồn tại. Đang tự động đăng xuất...");
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
      localStorage.removeItem('storeId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;