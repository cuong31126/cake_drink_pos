import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Kiểm tra xem có token cũ trong máy không để tự động khôi phục phiên
    const checkLoginStatus = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          // Gọi API lấy thông tin cá nhân (API số 6)
          const res = await API.get('/users/profile');
          setUser(res.data.user);
        } catch (error) {
          console.error("Token hết hạn hoặc không hợp lệ:", error);
          logout();
        }
      }
      setLoading(false);
    };
    checkLoginStatus();
  }, []);

  const login = (userData, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('username', userData.name);
    localStorage.setItem('storeId', userData.store_id || 'store_Q1');
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('storeId');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook tùy biến để gọi nhanh Context ở các trang khác
export const useAuth = () => useContext(AuthContext);