require('dotenv').config();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { neon } = require('@neondatabase/serverless');

const DB_PATH = path.join(__dirname, '../loan_data.db');
const DATABASE_URL = process.env.DATABASE_URL;
const usingNeon = Boolean(DATABASE_URL && DATABASE_URL.trim());
let db;
let neonClient;
let neonReady = false;

function getRecordId(record) {
    return record && (record.loan_id || record.borrower_id || record.fund_id || record.id || null);
}

async function ensureNeonTable() {
    if (!usingNeon) return;
    if (neonReady) return;

    neonClient = neon(DATABASE_URL);
    await neonClient`
        CREATE TABLE IF NOT EXISTS records (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            record_id TEXT UNIQUE,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await neonClient`CREATE INDEX IF NOT EXISTS idx_type ON records(type)`;
    neonReady = true;
}

function parseRows(rows) {
    return rows.map(row => {
        try {
            return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        } catch (err) {
            return row.data;
        }
    });
}

const database = {
    init() {
        if (usingNeon) {
            ensureNeonTable()
                .then(() => console.log('✅ Kết nối Neon thành công'))
                .catch(err => console.error('❌ Lỗi kết nối Neon:', err));
            return;
        }

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Lỗi kết nối SQLite:', err);
                return;
            }
            console.log('✅ Kết nối SQLite thành công:', DB_PATH);
            this.createTables();
        });
    },

    createTables() {
        db.serialize(() => {
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

            db.run(`CREATE INDEX IF NOT EXISTS idx_type ON records(type)`, (err) => {
                if (err) console.error('❌ Lỗi tạo index:', err);
            });
        });
    },

    async getAllRecords(callback) {
        if (usingNeon) {
            try {
                await ensureNeonTable();
                const rows = await neonClient`SELECT data FROM records ORDER BY id DESC`;
                callback(null, parseRows(rows));
            } catch (err) {
                console.error('❌ Lỗi lấy dữ liệu Neon:', err);
                callback(err, []);
            }
            return;
        }

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

    async createRecord(record, callback) {
        const recordId = getRecordId(record) || `record_${Date.now()}`;
        const type = record.type || 'unknown';

        if (usingNeon) {
            try {
                await ensureNeonTable();
                await neonClient`
                    INSERT INTO records (type, record_id, data) VALUES (${type}, ${recordId}, ${JSON.stringify(record)})
                    ON CONFLICT (record_id) DO UPDATE SET data = EXCLUDED.data, type = EXCLUDED.type, updated_at = CURRENT_TIMESTAMP
                `;
                console.log(`✅ Bản ghi mới tạo hoặc cập nhật trên Neon: ${recordId}`);
                callback(null);
            } catch (err) {
                console.error('❌ Lỗi tạo bản ghi Neon:', err);
                callback(err);
            }
            return;
        }

        const data = JSON.stringify(record);
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

    async updateRecord(recordId, record, callback) {
        const type = record.type || 'unknown';

        if (usingNeon) {
            try {
                await ensureNeonTable();
                await neonClient`
                    INSERT INTO records (type, record_id, data) VALUES (${type}, ${recordId}, ${JSON.stringify(record)})
                    ON CONFLICT (record_id) DO UPDATE SET data = EXCLUDED.data, type = EXCLUDED.type, updated_at = CURRENT_TIMESTAMP
                `;
                console.log(`✅ Bản ghi Neon cập nhật hoặc tạo mới: ${recordId}`);
                callback(null);
            } catch (err) {
                console.error('❌ Lỗi cập nhật Neon:', err);
                callback(err);
            }
            return;
        }

        const data = JSON.stringify(record);
        db.run(
            `UPDATE records SET data = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE record_id = ?`,
            [data, type, recordId],
            function(err) {
                if (err) {
                    console.error('❌ Lỗi cập nhật bản ghi:', err);
                    return callback(err);
                }
                if (this.changes === 0) {
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
