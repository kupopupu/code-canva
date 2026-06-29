# 🚀 Hướng dẫn kết nối Database

## Cài đặt

1. **Cài đặt dependencies:**
```bash
npm install
```

2. **Khởi động server:**
```bash
npm start
```

Server sẽ chạy tại `http://localhost:3000`

## Cấu trúc Backend

- `server.js` - Express server chính
- `api/database.js` - Quản lý SQLite database
- `loan_data.db` - File database (tự động tạo)

## API Endpoints

### GET `/api/data`
Lấy toàn bộ dữ liệu

**Response:**
```json
[
  {
    "type": "loan",
    "loan_id": "KV001",
    "borrower_name": "Nguyễn Văn A",
    "principal": 1000000,
    ...
  },
  {
    "type": "fund",
    "fund_id": "default-quy-chung",
    "fund_name": "Quỹ chung",
    "fund_amount": 5000000
  }
]
```

### POST `/api/data`
Tạo bản ghi mới

**Request body:**
```json
{
  "type": "loan",
  "loan_id": "KV002",
  "borrower_name": "Nguyễn Văn B",
  "principal": 2000000,
  ...
}
```

### PUT `/api/data`
Cập nhật bản ghi

**Request body:**
```json
{
  "type": "loan",
  "loan_id": "KV001",
  "borrower_name": "Nguyễn Văn A",
  "principal": 1500000,
  ...
}
```

## Troubleshooting

### Lỗi `npm: command not found`
- Cần cài Node.js từ https://nodejs.org/

### Lỗi `EADDRINUSE: address already in use`
- Port 3000 đã bị sử dụng. Giải pháp:
```bash
# Tìm process đang dùng port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Hoặc chạy server trên port khác
PORT=3001 npm start
```

### Database không kết nối được
- Xóa file `loan_data.db` nếu tồn tại, server sẽ tạo lại tự động

## Tính năng

✅ Lưu trữ khoản vay, khách hàng, quỹ  
✅ Ghi nhận thanh toán hàng ngày  
✅ Quản lý nguồn vốn  
✅ Tính toán lãi suất tự động  
✅ Dữ liệu lưu trữ local (SQLite)

---

**Lưu ý:** Khi khởi động server, ứng dụng web sẽ gọi `http://localhost:3000/api/data` để lấy dữ liệu. Hãy chắc chắn server đang chạy trước khi sử dụng ứng dụng.
