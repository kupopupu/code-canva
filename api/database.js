const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../loan_data.db');
let db;

const database = {
    init() {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Lỗi kết nối database:', err);
                return;
            }
            console.log('✅ Kết nối SQLite thành công:', DB_PATH);
            this.createTables();
        });
    },

    createTables() {
        db.serialize(() => {
            // Tạo bảng chính để lưu toàn bộ bản ghi dưới dạng JSON
            db.run(`
                CREATE TABLE IF NOT EXISTS records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    record_id TEXT UNIQUE,
                    data TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) console.error('❌ Lỗi tạo bảng records:', err);
                else console.log('✅ Bảng records sẵn sàng');
            });

            // Tạo index để truy vấn nhanh
            db.run(`CREATE INDEX IF NOT EXISTS idx_type ON records(type)`, (err) => {
                if (err) console.error('❌ Lỗi tạo index:', err);
            });
        });
    },

    getAllRecords(callback) {
        db.all('SELECT data FROM records ORDER BY id DESC', [], (err, rows) => {
            if (err) {
                console.error('❌ Lỗi lấy dữ liệu:', err);
                return callback(err, []);
            }

            try {
                const records = rows.map(row => JSON.parse(row.data));
                callback(null, records);
            } catch (parseErr) {
                console.error('❌ Lỗi parse JSON:', parseErr);
                callback(parseErr, []);
            }
        });
    },

    createRecord(record, callback) {
        const recordId = record.loan_id || record.borrower_id || record.fund_id || `record_${Date.now()}`;
        const data = JSON.stringify(record);
        const type = record.type || 'unknown';

        db.run(
            `INSERT INTO records (type, record_id, data) VALUES (?, ?, ?)`,
            [type, recordId, data],
            (err) => {
                if (err) {
                    console.error('❌ Lỗi tạo bản ghi:', err);
                    return callback(err);
                }
                console.log(`✅ Bản ghi mới tạo: ${recordId}`);
                callback(null);
            }
        );
    },

    updateRecord(recordId, record, callback) {
        const data = JSON.stringify(record);
        const type = record.type || 'unknown';

        db.run(
            `UPDATE records SET data = ?, type = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE record_id = ?`,
            [data, type, recordId],
            function(err) {
                if (err) {
                    console.error('❌ Lỗi cập nhật bản ghi:', err);
                    return callback(err);
                }
                if (this.changes === 0) {
                    // Nếu không tìm thấy, thêm mới
                    console.log(`⚠️  Bản ghi không tìm thấy, tạo mới: ${recordId}`);
                    database.createRecord(record, callback);
                } else {
                    console.log(`✅ Bản ghi cập nhật: ${recordId}`);
                    callback(null);
                }
            }
        );
    },

    close() {
        if (db) {
            db.close((err) => {
                if (err) console.error('❌ Lỗi đóng database:', err);
                else console.log('✅ Database đã đóng');
            });
        }
    }
};

module.exports = database;
