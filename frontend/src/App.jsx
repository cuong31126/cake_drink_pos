import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import ServiceSelection from './pages/ServiceSelection';
import TableMap from './pages/TableMap';
import OrderMenu from './pages/OrderMenu';
import KitchenDashboard from './pages/KitchenDashboard';
import ChatDashboard from './pages/ChatDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BillManagement from './pages/BillManagement';
import { AuthProvider } from './context/AuthContext';

// Tạo một component bao bọc bên trong Router để có thể sử dụng được hook useNavigate

// Đoạn chỉnh sửa bên trong AppContent của App.jsx
const AppContent = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Không truyền prop tĩnh currentStaff nữa để Topbar tự đọc dữ liệu động */}
      {window.location.pathname !== '/login' && (
        <Topbar openChatModal={() => navigate('/chat')} />
      )}
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ServiceSelection />} />
        <Route path="/tables" element={<TableMap />} />
        <Route path="/menu" element={<OrderMenu />} />
        <Route path="/kitchen" element={<KitchenDashboard />} />
        <Route path="/chat" element={<ChatDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/bills" element={<BillManagement />} />
      </Routes>
    </div>
  );
};


function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;