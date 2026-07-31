const { PayOS } = require('@payos/node');

/**
 * Khởi tạo đối tượng PayOS SDK bằng cách cấu hình các tham số bảo mật
 * Lấy trực tiếp từ tài khoản Dashboard PayOS (môi trường Sandbox hoặc Live)
 */
const payosClientID = process.env.PAYOS_CLIENT_ID || '';
const payosAPIKey = process.env.PAYOS_API_KEY || '';
const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY || '';

if (!payosClientID || !payosAPIKey || !payosChecksumKey) {
  console.warn("[PayOS Cảnh báo] Thiếu các khóa cấu hình PayOS trong file .env. Hệ thống thanh toán QR có thể không hoạt động.");
}

// Khởi tạo instance PayOS SDK v2
const payos = new PayOS({
  clientId: payosClientID,
  apiKey: payosAPIKey,
  checksumKey: payosChecksumKey
});

module.exports = payos;