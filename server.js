const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./api/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Initialize database
db.init();

// Mock SDK endpoints (để app không lỗi khi không có SDK thực)
app.get('/_sdk/telemetry_sdk.js', (req, res) => {
    res.type('application/javascript').send('// Mock telemetry SDK\nwindow.telemetry = {};');
});

app.get('/_sdk/resizing_sdk.js', (req, res) => {
    res.type('application/javascript').send('// Mock resizing SDK\nwindow.resizing = {};');
});

app.get('/_sdk/editing_sdk.js', (req, res) => {
    res.type('application/javascript').send('// Mock editing SDK\nwindow.editing = {};');
});

app.get('/_sdk/data_sdk.js', (req, res) => {
    res.type('application/javascript').send('// Mock data SDK\nwindow.dataSdk = {};');
});

// API Routes
app.get('/api/data', (req, res) => {
    db.getAllRecords((err, records) => {
        if (err) {
            console.error('Error fetching records:', err);
            return res.status(500).json({ error: 'Lỗi lấy dữ liệu từ database', details: err.message });
        }
        res.json(records);
    });
});

app.post('/api/data', (req, res) => {
    const record = req.body;
    db.createRecord(record, (err) => {
        if (err) {
            console.error('Error creating record:', err);
            return res.status(500).json({ error: 'Lỗi tạo bản ghi', details: err.message });
        }
        res.json({ success: true });
    });
});

app.put('/api/data', (req, res) => {
    const record = req.body;
    const id = record.loan_id || record.borrower_id || record.fund_id || record.id;
    
    db.updateRecord(id, record, (err) => {
        if (err) {
            console.error('Error updating record:', err);
            return res.status(500).json({ error: 'Lỗi cập nhật bản ghi', details: err.message });
        }
        res.json({ success: true });
    });
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📊 Database: SQLite (./loan_data.db)`);
    console.log(`\n💡 Mở trình duyệt: http://localhost:${PORT}`);
});
