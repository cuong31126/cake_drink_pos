import React, { useState, useEffect } from 'react';
import API from '../services/api';

const ChatDashboard = () => {
  const userRole = localStorage.getItem('userRole') || 'user';
  const username = localStorage.getItem('username') || 'Khách hàng';

  const [activeRoomId, setActiveRoomId] = useState(null);
  const [aiRoomId, setAiRoomId] = useState(null);
  const [staffRoomId, setStaffRoomId] = useState(null); // Chỉ dùng cho Khách hàng
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');

  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState([]);

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
            const newAiRes = await API.post('/chats/rooms', { is_ai_room: true });
            if (newAiRes.data.success) {
              aiRoom = newAiRes.data.data;
            }
          }
          // Tự động tạo phòng Người thật nếu chưa có
          if (!humanRoom) {
            const newHumanRes = await API.post('/chats/rooms', { is_ai_room: false });
            if (newHumanRes.data.success) {
              humanRoom = newHumanRes.data.data;
            }
          }

          if (aiRoom) setAiRoomId(aiRoom._id);
          if (humanRoom) setStaffRoomId(humanRoom._id);

          // Mặc định chọn phòng tư vấn nhân viên khi mới vào
          if (!activeRoomId) {
            setActiveRoomId(humanRoom ? humanRoom._id : (aiRoom ? aiRoom._id : null));
          }
        } 
        // B. XỬ LÝ CHO NHÂN VIÊN/ADMIN (STAFF/ADMIN)
        else {
          // Tạo phòng AI nội bộ nếu chưa có
          if (!aiRoom) {
            const newAiRes = await API.post('/chats/rooms', { is_ai_room: true });
            if (newAiRes.data.success) {
              rooms = [newAiRes.data.data, ...rooms];
              aiRoom = newAiRes.data.data;
            }
          }

          if (aiRoom) setAiRoomId(aiRoom._id);
          setChatRooms(rooms.filter(r => !r.is_ai_room));

          // Mặc định chọn phòng AI khi mới vào
          if (!activeRoomId && aiRoom) {
            setActiveRoomId(aiRoom._id);
          }
        }
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách phòng chat:", err);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

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
    // Chỉ đồng bộ tự động đối với các phòng chat giữa khách hàng & nhân viên
    if (activeRoomId && activeRoomId !== aiRoomId) {
      interval = setInterval(fetchMessages, 3000);
    }

    return () => clearInterval(interval);
  }, [activeRoomId, aiRoomId]);

  // 3. Hàm gửi tin nhắn
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeRoomId) return;

    const text = inputMessage.trim();
    setInputMessage('');

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
      alert(err.response?.data?.message || "Không thể truyền tin nhắn.");
    }
  };

  const filteredRooms = chatRooms.filter(room => 
    room.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-16 flex">
      
      {/* 🧭 CỘT BÊN TRÁI: SIDEBAR PHÂN BIỆT ROLE */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-16 bottom-0 z-10">
        
        {userRole === 'user' ? (
          // A. SIDEBAR DÀNH CHO KHÁCH HÀNG (USER)
          <div className="flex-1 p-4 space-y-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Hỗ trợ khách hàng</span>
            
            {/* Nút 1: Trò chuyện với nhân viên */}
            {staffRoomId && (
              <button
                onClick={() => setActiveRoomId(staffRoomId)}
                className={`w-full flex items-center p-3.5 rounded-xl text-left transition-all ${
                  activeRoomId === staffRoomId 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mr-3 shadow-inner">
                  👤
                </div>
                <div>
                  <h4 className="font-bold text-sm">Hỗ trợ viên trực quầy</h4>
                  <p className={`text-xs ${activeRoomId === staffRoomId ? 'text-blue-100' : 'text-gray-400'} truncate max-w-[170px]`}>
                    Nhắn tin trao đổi trực tiếp
                  </p>
                </div>
              </button>
            )}

            {/* Nút 2: Hỏi đáp AI */}
            {aiRoomId && (
              <button
                onClick={() => setActiveRoomId(aiRoomId)}
                className={`w-full flex items-center p-3.5 rounded-xl text-left transition-all ${
                  activeRoomId === aiRoomId 
                    ? 'bg-amber-500 text-white shadow-md' 
                    : 'bg-amber-50 bg-opacity-40 border border-amber-100 hover:bg-amber-100/50 text-amber-900'
                }`}
              >
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-xl font-bold mr-3">
                  🤖
                </div>
                <div>
                  <h4 className="font-bold text-sm">Trợ lý ảo AI (Gemini)</h4>
                  <p className={`text-xs ${activeRoomId === aiRoomId ? 'text-amber-100' : 'text-amber-700'} truncate max-w-[170px]`}>
                    Hỏi đáp thông tin thực đơn 24/7
                  </p>
                </div>
              </button>
            )}
          </div>
        ) : (
          // B. SIDEBAR DÀNH CHO NHÂN VIÊN / ADMIN (STAFF/ADMIN)
          <>
            <div className="p-4 border-b border-gray-100">
              <input
                type="text"
                placeholder="🔍 Tìm cuộc hội thoại..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Trợ lý AI nghiệp vụ nội bộ */}
            {aiRoomId && (
              <div className="p-2 border-b border-gray-200 bg-amber-50 bg-opacity-40">
                <button
                  onClick={() => setActiveRoomId(aiRoomId)}
                  className={`w-full flex items-center p-3 rounded-xl text-left transition-all ${
                    activeRoomId === aiRoomId 
                      ? 'bg-amber-100 border border-amber-300 shadow-sm' 
                      : 'hover:bg-amber-50 border border-transparent'
                  }`}
                >
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-xl font-bold mr-3 shadow-sm">
                    🤖
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-900">Trợ lý AI Nghiệp vụ</h4>
                    <p className="text-xs text-amber-700 truncate max-w-[180px]">Hỗ trợ quy chế kết ca, đóng két</p>
                  </div>
                </button>
              </div>
            )}

            {/* Danh sách hội thoại của khách hàng nhắn tới quầy */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <span className="text-[11px] font-bold text-gray-400 px-3 uppercase tracking-wider block my-2">Hội thoại khách hàng</span>
              {filteredRooms.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-4">Chưa có khách hàng nhắn tin</div>
              ) : filteredRooms.map(room => (
                <button
                  key={room._id}
                  onClick={() => setActiveRoomId(room._id)}
                  className={`w-full flex items-center p-3 rounded-xl text-left transition-all ${
                    activeRoomId === room._id 
                      ? 'bg-blue-50 text-blue-800 border border-blue-100 shadow-xs' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold mr-3">
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate uppercase text-gray-800">
                      Khách hàng #{room.customer_id.slice(-4).toUpperCase()}
                    </h4>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{room.last_message || 'Chưa có tin nhắn'}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 💬 CỘT BÊN PHẢI: KHUNG CHÁT CHI TIẾT */}
      <div className="flex-1 ml-80 bg-gray-50 flex flex-col fixed right-0 left-80 top-16 bottom-0">
        {activeRoomId ? (
          <>
            <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                <h3 className="font-bold text-gray-800 text-sm">
                  {activeRoomId === aiRoomId 
                    ? 'Tương tác Trợ lý ảo AI Gemini' 
                    : userRole === 'user' 
                      ? 'Cửa sổ trao đổi với Nhân viên Hỗ trợ' 
                      : `Hội thoại với Khách hàng #${chatRooms.find(r => r._id === activeRoomId)?.customer_id.slice(-4).toUpperCase() || ''}`}
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg) => {
                // Xác định bong bóng chat là gửi hay nhận tùy thuộc vào vai trò hiện tại
                const isMyMessage = (userRole === 'user' && msg.sender_type === 'user') || (userRole !== 'user' && msg.sender_type === 'staff');
                
                return (
                  <div 
                    key={msg._id} 
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-2xs ${
                      isMyMessage
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : msg.sender_type === 'bot'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200 rounded-tl-none'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}>
                      {msg.message_text}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex items-center space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={activeRoomId === aiRoomId ? "Nhập câu hỏi nhờ AI tư vấn..." : "Nhập phản hồi tin nhắn..."}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit"
                className={`px-5 py-2.5 text-white font-bold rounded-xl text-sm transition-colors shadow-sm ${
                  activeRoomId === aiRoomId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Gửi 🚀
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm">
            <span>Vui lòng chọn kênh trao đổi hỗ trợ.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatDashboard;