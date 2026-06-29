# 📚 Hướng dẫn cài đặt và chạy Server

## ⚡ Bước 1: Cài đặt Node.js

1. Truy cập: https://nodejs.org/
2. Tải phiên bản LTS (Long Term Support)
3. Cài đặt và đảm bảo chọn "Add to PATH"
4. Mở PowerShell/Command Prompt và chạy:
```bash
node --version
npm --version
```
Nếu hiển thị số phiên bản → ✅ Node.js đã cài thành công

---

## 🚀 Bước 2: Cài đặt Dependencies

1. Mở PowerShell/Command Prompt
2. Cd vào thư mục project:
```bash
cd "g:\Game\Code Canva"
```

3. Cài đặt toàn bộ dependencies:
```bash
npm install
```

Chờ cho đến khi hoàn thành (có thể mất 1-2 phút)

---

## ▶️ Bước 3: Khởi động Server

Chạy lệnh:
```bash
npm start
```

Bạn sẽ thấy:
```
✅ Kết nối SQLite thành công: g:\Game\Code Canva\loan_data.db
✅ Bảng records sẵn sàng
🚀 Server đang chạy tại http://localhost:3000
📊 Database: SQLite (./loan_data.db)
```

---

## 🌐 Bước 4: Truy cập Ứng dụng

1. Mở trình duyệt (Chrome, Firefox, Edge)
2. Truy cập: **http://localhost:3000**
3. Ứng dụng sẽ kết nối tự động với database

---

## ✅ Kiểm tra Kết nối

**Cách 1:** Thử tạo khoản vay
- Nhấn "Tạo khoản vay mới"
- Điền dữ liệu và nhấn "Tạo khoản vay"
- Nếu thành công → ✅ Database hoạt động

**Cách 2:** Check Console (F12)
- Nhấn F12 → Console
- Không có lỗi màu đỏ → ✅ OK

---

## 🛑 Dừng Server

- Nhấn **Ctrl + C** trong PowerShell/Command Prompt

---

## 🔧 Troubleshooting

| Lỗi | Giải pháp |
|-----|----------|
| `npm: command not found` | Node.js chưa được cài. Cài lại từ nodejs.org |
| `EADDRINUSE: address already in use (:3000)` | Kill process cũ hoặc chạy trên port khác: `PORT=3001 npm start` |
| `Không kết nối được database` | Xóa file `loan_data.db`, restart server |
| `Cannot find module 'express'` | Chạy `npm install` lại |

---

## 📊 Dữ liệu được lưu ở:

**File:** `g:\Game\Code Canva\loan_data.db`

Bạn có thể mở file này bằng SQLite Browser hoặc xóa nó để reset dữ liệu.

---

**Bây giờ bạn có thể test ứng dụng với database thực! 🎉**
