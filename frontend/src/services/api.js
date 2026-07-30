import axios from 'axios';

// Tự động chuẩn hóa URL API: Nếu biến VITE_API_URL thiếu '/api/v1' ở cuối, tự động bổ sung vào
const getBaseURL = () => {
  let rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  rawUrl = rawUrl.trim().replace(/\/+$/, '');
  if (!rawUrl.endsWith('/api/v1')) {
    return `${rawUrl}/api/v1`;
  }
  return rawUrl;
};

// Khởi tạo instance Axios với đường dẫn chuẩn hóa
const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // Ngắt kết nối nếu quá 10 giây không phản hồi
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