# 🎯 Quick Start - Chạy ngay trong 2 phút

## Bước 1️⃣: Cài Node.js (nếu chưa có)
- Download từ: https://nodejs.org/ (chọn LTS)
- Cài đặt và chọn "Add to PATH"
- Kiểm tra: Mở PowerShell gõ `node --version`

## Bước 2️⃣: Mở PowerShell/CMD tại thư mục project

**Nhanh nhất:** 
- Nhấn `Shift + Right Click` trong folder `g:\Game\Code Canva`
- Chọn "Mở PowerShell tại đây"

Hoặc gõ lệnh:
```bash
cd "g:\Game\Code Canva"
```

## Bước 3️⃣: Cài đặt dependencies (chỉ cần 1 lần)
```bash
npm install
```

## Bước 4️⃣: Khởi động server
```bash
npm start
```

✅ Khi thấy:
```
🚀 Server đang chạy tại http://localhost:3000
```

## Bước 5️⃣: Mở trình duyệt
- Truy cập: **http://localhost:3000**
- Bắt đầu test! 🎉

---

## ⚠️ Gặp lỗi?

| Lỗi | Cách fix |
|-----|---------|
| `npm: command not found` | Cài lại Node.js |
| `EADDRINUSE` | Đóng app khác dùng port 3000, hoặc chạy `PORT=3001 npm start` |
| `Cannot find module` | Chạy `npm install` lại |

---

## 🛑 Dừng server
- Nhấn **Ctrl + C**

**Xong! Bây giờ bạn có backend đúng thực! 💪**
