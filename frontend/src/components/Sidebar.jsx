import React from 'react';

const Sidebar = ({ 
  searchQuery, 
  setSearchQuery, 
  activeRoomId, 
  setActiveRoomId, 
  chatRooms 
}) => {
  
  // Lọc danh sách khách hàng theo từ khóa tìm kiếm
  const filteredRooms = chatRooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-16 bottom-0 z-10">
      
      {/* 1. Ô Tìm kiếm khách hàng */}
      <div className="p-4 border-b border-gray-100">
        <input
          type="text"
          placeholder="🔍 Tìm kiếm khách hàng..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        />
      </div>

      {/* 2. NÚT TRỢ LÝ AI CỐ ĐỊNH NGAY DƯỚI Ô TÌM KIẾM */}
      <div className="p-2 border-b border-gray-200 bg-amber-50 bg-opacity-40">
        <button
          onClick={() => setActiveRoomId('room_ai_fixed')}
          className={`w-full flex items-center p-3 rounded-xl text-left transition-all ${
            activeRoomId === 'room_ai_fixed' 
              ? 'bg-amber-100 border border-amber-300 shadow-sm' 
              : 'hover:bg-amber-50 border border-transparent'
          }`}
        >
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-xl font-bold mr-3 shadow-sm">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-amber-900 truncate">Trợ lý AI (Hỏi đáp nội bộ)</h4>
            <p className="text-xs text-amber-700 truncate">Hệ thống giải đáp nghiệp vụ</p>
          </div>
        </button>
      </div>

      {/* 3. Danh sách các phòng chat của người thật */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <span className="text-[11px] font-bold text-gray-400 px-3 uppercase tracking-wider block my-2">
          Hội thoại của khách
        </span>
        
        {filteredRooms.map(room => (
          <button
            key={room._id}
            onClick={() => setActiveRoomId(room._id)}
            className={`w-full flex items-center p-3 rounded-xl text-left transition-all ${
              activeRoomId === room._id 
                ? 'bg-blue-50 text-blue-800 border border-blue-100' 
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
              {room.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{room.name}</h4>
              <p className="text-xs text-gray-400 truncate">{room.last_message}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;