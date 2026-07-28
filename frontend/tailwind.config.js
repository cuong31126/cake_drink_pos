/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Quét toàn bộ file trong thư mục src để kích hoạt class Tailwind
  ],
  theme: {
    extend: {
      colors: {
        // Cấu hình các tông màu chủ đạo cho tiệm bánh & nước nếu cần mở rộng sau này
        brand: {
          light: '#FDF8F5',
          dark: '#8B5E3C',
        }
      }
    },
  },
  plugins: [],
}