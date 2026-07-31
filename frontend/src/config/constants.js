// Cấu hình tài khoản nhận tiền thực tế VietQR / PayOS
export const BANK_BIN = '970422'; // MBBank
export const ACCOUNT_NUMBER = '0969839241';
export const ACCOUNT_NAME = 'LE QUOC CUONG';

// Danh sách các chi nhánh cửa hàng POS
export const BRANCHES = [
  { id: 'store_Q1', label: 'Chi nhánh 1 - Quận 1' },
  { id: 'store_ThuDuc', label: 'Chi nhánh 2 - Thủ Đức' },
];

export const getBranchLabel = (id) => BRANCHES.find(b => b.id === id)?.label || id;
