import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import TableMap from './pages/TableMap';
import OrderMenu from './pages/OrderMenu';
import ChatDashboard from './pages/ChatDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BillManagement from './pages/BillManagement';
import OrderQueue from './pages/OrderQueue';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import { Toaster } from 'react-hot-toast';
import MyOrders from './pages/MyOrders';

const RootElement = () => {
  const role = localStorage.getItem('userRole');
  if (role === 'user') {
    return <Navigate to="/menu?type=take-away" replace />;
  }
  return <TableMap />;
};

const AppContent = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900'
    }`}>
      <Toaster position="top-right" reverseOrder={false} />
      {window.location.pathname !== '/login' && (
        <Topbar openChatModal={() => navigate('/chat')} />
      )}
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootElement />} />
        <Route path="/tables" element={<TableMap />} />
        <Route path="/menu" element={<OrderMenu />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/chat" element={<ChatDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/bills" element={<BillManagement />} />
        <Route path="/queue" element={<OrderQueue />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};


function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;