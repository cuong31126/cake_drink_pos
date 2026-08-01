let Redis = null;
try {
  Redis = require('ioredis');
} catch (err) {
  // ioredis chưa được cài đặt hoặc không tìm thấy module
}

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisClient = null;
let isRedisConnected = false;

if (Redis) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) return null;
        return 1000;
      },
      enableOfflineQueue: false,
      lazyConnect: true
    });

    redisClient.connect()
      .then(() => {
        isRedisConnected = true;
        console.log('⚡ [Redis] Đã kết nối Redis Cache thành công!');
      })
      .catch(() => {
        isRedisConnected = false;
        console.log('ℹ️ [Redis Status] Server Redis chưa bật. Tự động chuyển sang sử dụng MongoDB Atlas.');
        redisClient = null;
      });

    redisClient.on('error', () => {
      isRedisConnected = false;
    });
  } catch (err) {
    isRedisConnected = false;
    redisClient = null;
  }
}

/**
 * Lấy dữ liệu từ Redis Cache (Safely return null if unavailable)
 */
const getCache = async (key) => {
  if (!redisClient || !isRedisConnected) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
};

/**
 * Lưu dữ liệu vào Redis Cache với thời gian TTL (giây)
 */
const setCache = async (key, value, ttlSeconds = 300) => {
  if (!redisClient || !isRedisConnected) return;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    // Silent failover
  }
};

/**
 * Xóa dữ liệu Cache khi có cập nhật
 */
const deleteCache = async (key) => {
  if (!redisClient || !isRedisConnected) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    // Silent failover
  }
};

module.exports = {
  getCache,
  setCache,
  deleteCache
};
