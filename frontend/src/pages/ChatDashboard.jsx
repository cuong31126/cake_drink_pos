import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ChatDashboard = () => {
  const [searchParams] = useSearchParams();
  const targetCustomerId = searchParams.get('customerId');
  const { user } = useAuth();
  const { isDarkMode: darkMode, toggleDarkMode: setDarkMode } = useTheme();
  const userRole = user?.role || localStorage.getItem('userRole') || 'user';

  const DEFAULT_LOGO = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=120&auto=format&fit=crop&q=80';
  const storeLogo = localStorage.getItem('customLogoUrl') || DEFAULT_LOGO;

  const getCustomerAvatarUrl = (name, customAvatar) => {
    if (customAvatar && customAvatar.startsWith('http')) return customAvatar;
    const cleanName = name || 'Khách hàng';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=3b82f6&color=ffffff&bold=true&font-size=0.45`;
  };

  const [activeRoomId, setActiveRoomId] = useState(null);
  const [aiRoomId, setAiRoomId] = useState(null);
  const [staffRoomId, setStaffRoomId] = useState(null); // Chỉ dùng cho Khách hàng
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');

  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Tải danh sách phòng chat từ Backend
  const loadRooms = async () => {
    try {
      const res = await API.get('/chats/rooms');
      if (res.data.success) {
        let rooms = res.data.data;
        
        let aiRoom = rooms.find(r => r.is_ai_room);
        let humanRoom = rooms.find(r => !r.is_ai_room);

        // A. XỬ LÝ CHO KHÁCH HÀNG THƯỜNG (USER)
        if (userRole === 'user') {
          // Tự động tạo phòng AI nếu chưa có
          if (!aiRoom) {
            try {
              const newAiRes = await API.post('/chats/rooms', { is_ai_room: true });
              if (newAiRes.data.success) {
                aiRoom = newAiRes.data.data;
              }
            } catch (e) {
              console.error("Lỗi tạo phòng AI:", e);
            }
          }
          // Tự động tạo phòng Người thật nếu chưa có
          if (!humanRoom) {
            try {
              const newHumanRes = await API.post('/chats/rooms', { is_ai_room: false });
              if (newHumanRes.data.success) {
                humanRoom = newHumanRes.data.data;
              }
            } catch (e) {
              console.error("Lỗi tạo phòng hỗ trợ:", e);
            }
          }

          if (aiRoom) setAiRoomId(aiRoom._id);
          if (humanRoom) setStaffRoomId(humanRoom._id);

          // 💡 ĐẢM BẢO NGƯỜI DÙNG MỚI ĐĂNG KÝ CÓ NGAY ROOM ACTIVE ĐỂ NHẮN TIN
          const defaultTargetId = humanRoom ? humanRoom._id : (aiRoom ? aiRoom._id : null);
          if (defaultTargetId && !activeRoomId) {
            setActiveRoomId(defaultTargetId);
          }
        } 
        // B. XỬ LÝ CHO NHÂN VIÊN/ADMIN (STAFF/ADMIN)
        else {
          // Tạo phòng AI nội bộ nếu chưa có
          if (!aiRoom) {
            try {
              const newAiRes = await API.post('/chats/rooms', { is_ai_room: true });
              if (newAiRes.data.success) {
                rooms = [newAiRes.data.data, ...rooms];
                aiRoom = newAiRes.data.data;
              }
            } catch(e) {}
          }

          setChatRooms(rooms.filter(r => !r.is_ai_room));

          // 🎯 ƯU TIÊN CHỌN ĐÚNG PHÒNG CHAT CỦA KHÁCH HÀNG KHI CHUYỂN TỪ ORDERQUEUE TỚI
          if (targetCustomerId) {
            let targetRoom = rooms.find(r => 
              !r.is_ai_room && (
                r.customer_id === targetCustomerId || 
                r.customer_id?.toString() === targetCustomerId.toString() ||
                (r.customer_name && r.customer_name.toLowerCase() === targetCustomerId.toLowerCase())
              )
            );

            // 💡 Nếu chưa có phòng chat cho tài khoản mới này, Staff tự động tạo mới tại chỗ
            if (!targetRoom) {
              try {
                const createRes = await API.post('/chats/rooms', {
                  customer_id: targetCustomerId,
                  is_ai_room: false
                });
                if (createRes.data.success) {
                  targetRoom = createRes.data.data;
                  rooms = [targetRoom, ...rooms.filter(r => r._id !== targetRoom._id)];
                  setChatRooms(rooms.filter(r => !r.is_ai_room));
                }
              } catch (e) {
                console.error("Lỗi khởi tạo phòng chat cho tài khoản mới:", e);
              }
            }

            if (targetRoom) {
              setActiveRoomId(targetRoom._id);
              setShowMobileChat(true);
            } else {
              const firstRoom = rooms.find(r => !r.is_ai_room);
              if (firstRoom) setActiveRoomId(firstRoom._id);
            }
          } else if (!activeRoomId) {
            const firstCustomerRoom = rooms.find(r => !r.is_ai_room);
            if (firstCustomerRoom) {
              setActiveRoomId(firstCustomerRoom._id);
            } else if (aiRoom) {
              setActiveRoomId(aiRoom._id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách phòng chat:", err);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [userRole, targetCustomerId]);


  // 2. Tải lịch sử tin nhắn của phòng đang hoạt động (Tự động đồng bộ mỗi 3 giây nếu là phòng khách)
  const fetchMessages = async () => {
    if (!activeRoomId) return;
    try {
      const res = await API.get(`/chats/rooms/${activeRoomId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải tin nhắn:", err);
    }
  };

  useEffect(() => {
    fetchMessages();

    let interval;
    // Đồng bộ thời gian thực mỗi 3 giây đối với tin nhắn người thật
    if (activeRoomId && activeRoomId !== aiRoomId) {
      interval = setInterval(() => {
        if (!document.hidden) {
          fetchMessages();
        }
      }, 4000);
    }

    return () => clearInterval(interval);
  }, [activeRoomId, aiRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Hàm gửi tin nhắn
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeRoomId || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Hiển thị tin nhắn gửi của chính mình ngay lập tức
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      sender_type: userRole === 'user' ? 'user' : 'staff',
      message_text: text,
      createdAt: new Date()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      if (activeRoomId === aiRoomId) {
        // Gửi tới Trợ lý AI và nhận phản hồi từ Gemini
        const res = await API.post('/ai/chat-assistant', {
          room_id: activeRoomId,
          message_text: text
        });
        if (res.data.success) {
          fetchMessages();
        }
      } else {
        // Gửi tin nhắn thường vào phòng chat hỗ trợ
        const res = await API.post(`/chats/rooms/${activeRoomId}/messages`, {
          message_text: text
        });
        if (res.data.success) {
          fetchMessages();
          loadRooms();
        }
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      alert(err.response?.data?.message || "Không thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  };



  const filteredRooms = chatRooms.filter(room => 
    (room.customer_name && room.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (room.customer_id && room.customer_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (room.last_message && room.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isUserRole = userRole === 'user';
  const topPaddingClass = isUserRole ? 'pt-28 md:pt-32' : 'pt-16 md:pt-20';
  const containerHeight = isUserRole ? 'h-[calc(100vh-124px)] md:h-[calc(100vh-140px)]' : 'h-[calc(100vh-76px)] md:h-[calc(100vh-92px)]';

  return (
    <div className={`min-h-screen ${topPaddingClass} pb-1 sm:pb-3 px-1.5 sm:px-4 font-sans transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      <div className={`max-w-7xl mx-auto ${containerHeight} flex flex-col md:flex-row gap-2 sm:gap-3`}>
        
        {/* 🧭 CỘT BÊN TRÁI: DANH SÁCH PHÒNG CHAT (SIDEBAR MESSENGER) */}
        <div className={`w-full md:w-80 h-full rounded-2xl border flex flex-col shadow-lg transition-colors duration-300 overflow-hidden ${
          showMobileChat ? 'hidden md:flex' : 'flex'
        } ${
          darkMode ? 'bg-slate-900 border-slate-800/80 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          
          {isUserRole ? (
            // A. SIDEBAR DÀNH CHO KHÁCH HÀNG (USER)
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                🎧 Kênh hỗ trợ khách hàng
              </span>
              
              {/* Nút 1: Trò chuyện với nhân viên */}
              {staffRoomId && (
                <button
                  onClick={() => {
                    setActiveRoomId(staffRoomId);
                    setShowMobileChat(true);
                  }}
                  className={`w-full flex items-center p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                    activeRoomId === staffRoomId 
                      ? 'bg-blue-600 text-white shadow-md font-semibold' 
                      : darkMode 
                        ? 'bg-slate-800/80 border border-slate-700/80 hover:bg-slate-800 text-slate-200' 
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xl font-bold mr-3 shrink-0">
                    👤
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Hỗ trợ viên trực quầy</h4>
                    <p className={`text-xs ${
                      activeRoomId === staffRoomId 
                        ? 'text-blue-100' 
                        : darkMode ? 'text-slate-400' : 'text-slate-500'
                    } truncate max-w-[170px]`}>
                      Nhắn tin tư vấn trực tiếp
                    </p>
                  </div>
                </button>
              )}

              {/* Nút 2: Hỏi đáp AI */}
              {aiRoomId && (
                <button
                  onClick={() => {
                    setActiveRoomId(aiRoomId);
                    setShowMobileChat(true);
                  }}
                  className={`w-full flex items-center p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                    activeRoomId === aiRoomId 
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold' 
                      : darkMode 
                        ? 'bg-amber-950/40 border border-amber-900/50 hover:bg-amber-950/70 text-amber-300' 
                        : 'bg-amber-50 border border-amber-200 hover:bg-amber-100/60 text-amber-900'
                  }`}
                >
                  <img
                    src={storeLogo}
                    alt="Store Logo"
                    onError={(e) => { e.target.src = DEFAULT_LOGO; }}
                    className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 mr-3 shrink-0 shadow-xs"
                  />
                  <div>
                    <h4 className="font-bold text-sm">Trợ lý tự động cửa hàng</h4>
                    <p className={`text-xs ${
                      activeRoomId === aiRoomId 
                        ? 'text-amber-950 font-semibold' 
                        : darkMode ? 'text-amber-400/80' : 'text-amber-700'
                    } truncate max-w-[170px]`}>
                      Hỏi đáp thực đơn 24/7
                    </p>
                  </div>
                </button>
              )}
            </div>
          ) : (
            // B. SIDEBAR DÀNH CHO NHÂN VIÊN / ADMIN (STAFF/ADMIN)
            <>
              <div className={`p-3 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <input
                  type="text"
                  placeholder="🔍 Tìm tên khách, tin nhắn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    darkMode 
                      ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-400' 
                      : 'bg-slate-100 border border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Trợ lý AI nghiệp vụ nội bộ */}
              {aiRoomId && (
                <div className={`p-2 border-b ${darkMode ? 'border-slate-800 bg-amber-950/20' : 'border-slate-200 bg-amber-50/50'}`}>
                  <button
                    onClick={() => {
                      setActiveRoomId(aiRoomId);
                      setShowMobileChat(true);
                    }}
                    className={`w-full flex items-center p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      activeRoomId === aiRoomId 
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' 
                        : darkMode
                          ? 'hover:bg-amber-950/50 text-amber-300'
                          : 'hover:bg-amber-100/50 text-amber-900'
                    }`}
                  >
                    <img
                      src={storeLogo}
                      alt="Store Logo"
                      onError={(e) => { e.target.src = DEFAULT_LOGO; }}
                      className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 mr-2.5 shrink-0 shadow-xs"
                    />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm">Trợ lý AI Nghiệp vụ</h4>
                      <p className={`text-[11px] truncate max-w-[170px] ${
                        activeRoomId === aiRoomId ? 'text-slate-900' : darkMode ? 'text-amber-400/80' : 'text-amber-700'
                      }`}>Hỗ trợ quy chế kết ca, đóng két</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Danh sách hội thoại của khách hàng nhắn tới quầy */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <span className={`text-[11px] font-bold px-2 uppercase tracking-wider block my-1.5 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>Hội thoại khách hàng</span>
                {filteredRooms.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-4">Chưa có khách hàng nhắn tin</div>
                ) : filteredRooms.map(room => (
                  <button
                    key={room._id}
                    onClick={() => {
                      setActiveRoomId(room._id);
                      setShowMobileChat(true);
                    }}
                    className={`w-full flex items-center p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      activeRoomId === room._id 
                        ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                        : darkMode 
                          ? 'hover:bg-slate-800 text-slate-200 border border-transparent' 
                          : 'hover:bg-slate-100 text-slate-800 border border-transparent'
                    }`}
                  >
                    <img
                      src={getCustomerAvatarUrl(room.customer_name, room.customer_avatar)}
                      alt="Customer Avatar"
                      className="w-9 h-9 rounded-full object-cover border-2 border-blue-400 mr-2.5 shrink-0 shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm truncate">
                        {room.customer_name || `Khách #${room.customer_id.slice(-4).toUpperCase()}`}
                      </h4>
                      <p className={`text-[11px] truncate mt-0.5 ${
                        activeRoomId === room._id ? 'text-blue-100' : darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>{room.last_message || 'Chưa có tin nhắn'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 💬 CỘT BÊN PHẢI: KHUNG CHÁT THÔNG MINH KIỂU MESSENGER */}
        <div className={`w-full md:flex-1 h-full rounded-2xl border flex flex-col overflow-hidden shadow-lg transition-colors duration-300 ${
          !showMobileChat ? 'hidden md:flex' : 'flex'
        } ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {activeRoomId ? (
            <>
              {/* Header phòng chat chuẩn Messenger */}
              <div className={`h-14 border-b px-3 sm:px-5 flex items-center justify-between shadow-xs z-10 shrink-0 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {(() => {
                  const activeRoom = chatRooms.find(r => r._id === activeRoomId);
                  const isAiRoom = activeRoomId === aiRoomId;
                  const headerAvatar = isAiRoom 
                    ? storeLogo 
                    : getCustomerAvatarUrl(
                        isUserRole ? 'Hỗ trợ viên' : activeRoom?.customer_name,
                        activeRoom?.customer_avatar
                      );

                  return (
                    <div className="flex items-center space-x-2.5">
                      {/* Nút trở lại danh sách trò chuyện cho điện thoại */}
                      <button
                        onClick={() => setShowMobileChat(false)}
                        className="md:hidden p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Quay lại danh sách trò chuyện"
                      >
                        ⬅️
                      </button>

                      <div className="relative">
                        <img
                          src={headerAvatar}
                          alt="Avatar"
                          onError={(e) => { e.target.src = DEFAULT_LOGO; }}
                          className="w-8 h-8 rounded-full object-cover border-2 border-blue-400 shadow-xs"
                        />
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse absolute -bottom-0.5 -right-0.5 border border-white"></span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">
                          {isAiRoom 
                            ? 'Trợ lý tự động Sweet POS (24/7)' 
                            : isUserRole 
                              ? 'Nhân viên Hỗ Trợ Trực Quầy' 
                              : (activeRoom?.customer_name || 'Khách hàng')}
                        </h3>
                        <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                          <span>🟢 Đang hoạt động</span>
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* 🌗 Nút chuyển đổi Giao diện Sáng / Tối */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer shadow-xs ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' 
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{darkMode ? '☀️' : '🌙'}</span>
                  <span className="hidden sm:inline">{darkMode ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
                </button>
              </div>

              {/* Vùng hiển thị tin nhắn */}
              <div className={`flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 transition-colors ${
                darkMode ? 'bg-slate-950' : 'bg-slate-50/70'
              }`}>
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-10">
                    Chưa có tin nhắn nào trong hội thoại này. Hãy nhập nội dung bên dưới để bắt đầu!
                  </div>
                ) : messages.map((msg) => {
                  const isMyMessage = (isUserRole && msg.sender_type === 'user') || (!isUserRole && msg.sender_type === 'staff');
                  const activeRoom = chatRooms.find(r => r._id === activeRoomId);

                  const getMsgAvatar = (m) => {
                    if (m.sender_type === 'bot') return storeLogo;
                    if (m.sender_type === 'user') {
                      return getCustomerAvatarUrl(activeRoom?.customer_name, activeRoom?.customer_avatar);
                    }
                    return getCustomerAvatarUrl('Thu Ngân', null);
                  };

                  return (
                    <div 
                      key={msg._id} 
                      className={`flex items-end space-x-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMyMessage && (
                        <img
                          src={getMsgAvatar(msg)}
                          alt="Avatar"
                          onError={(e) => { e.target.src = DEFAULT_LOGO; }}
                          className="w-7 h-7 rounded-full object-cover border border-blue-400 shrink-0 mb-1 shadow-2xs"
                        />
                      )}
                      <div className={`max-w-[80%] sm:max-w-[70%] p-3 rounded-2xl text-xs sm:text-sm shadow-xs ${
                        isMyMessage
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : msg.sender_type === 'bot'
                            ? darkMode
                              ? 'bg-amber-950/80 text-amber-200 border border-amber-800/60 rounded-tl-xs'
                              : 'bg-amber-100 text-amber-900 border border-amber-200 rounded-tl-xs'
                            : darkMode
                              ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                      }`}>
                        {msg.message_text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Ô nhập và gửi tin nhắn */}
              <form onSubmit={handleSendMessage} className={`p-3 sm:p-4 border-t flex items-center space-x-2.5 shrink-0 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={sending}
                  placeholder={activeRoomId === aiRoomId ? "Hỏi Trợ lý AI..." : "Nhập tin nhắn..."}
                  className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    darkMode 
                      ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-400' 
                      : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
                <button 
                  type="submit"
                  disabled={sending || !inputMessage.trim()}
                  className={`px-4 sm:px-6 py-2.5 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md cursor-pointer flex items-center space-x-1 ${
                    sending || !inputMessage.trim()
                      ? 'bg-slate-300 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                      : activeRoomId === aiRoomId 
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold' 
                        : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <span>{sending ? 'Đang gửi...' : 'Gửi'}</span>
                  <span>🚀</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm space-y-3 p-4">
              <span className="text-4xl">💬</span>
              <span className="text-center">Vui lòng chọn một cuộc trò chuyện từ danh sách bên trái.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDashboard;