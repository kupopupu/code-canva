require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
const usingNeon = Boolean(DATABASE_URL && DATABASE_URL.trim());
let neonClient;
let neonReady = false;

function ensureFallbackStore() {
    if (!globalThis.__loanFallbackStore) {
        globalThis.__loanFallbackStore = [];
    }
    const store = globalThis.__loanFallbackStore;
    if (!store.some(r => r.type === 'fund' && r.fund_name && r.fund_name.toLowerCase() === 'quỹ chung')) {
        store.push({
            type: 'fund',
            fund_id: 'default-quy-chung',
            fund_name: 'Quỹ chung',
            fund_amount: 0
        });
    }
    return store;
}

function getRecordId(record) {
    return record && (record.loan_id || record.fund_id || record.fund_name || record.borrower_id || record.id || null);
}

function normalizeRecord(record) {
    if (!record || typeof record !== 'object' || !record.type) return null;
    return record;
}

async function ensureNeonClient() {
    if (!usingNeon) return;
    if (!neonClient) {
        neonClient = neon(DATABASE_URL);
    }
    if (neonReady) return;

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

async function getAllRecords() {
    if (!usingNeon) {
        return ensureFallbackStore();
    }
    await ensureNeonClient();
    const result = await neonClient`SELECT data FROM records ORDER BY id DESC`;
    return result.map(row => (typeof row.data === 'string' ? JSON.parse(row.data) : row.data));
}

async function createOrUpdateRecord(record) {
    const recordId = getRecordId(record) || `record_${Date.now()}`;
    const type = record.type || 'unknown';

    if (!usingNeon) {
        const store = ensureFallbackStore();
        const idx = store.findIndex(item => getRecordId(item) === recordId);
        if (idx >= 0) {
            store[idx] = record;
        } else {
            store.push(record);
        }
        return;
    }

    await ensureNeonClient();
    await neonClient`
        INSERT INTO records (type, record_id, data) VALUES (${type}, ${recordId}, ${JSON.stringify(record)})
        ON CONFLICT (record_id) DO UPDATE SET data = EXCLUDED.data, type = EXCLUDED.type, updated_at = CURRENT_TIMESTAMP
    `;
}

async function deleteRecord(recordId) {
    if (!usingNeon) {
        const store = ensureFallbackStore();
        globalThis.__loanFallbackStore = store.filter(item => getRecordId(item) !== recordId);
        return;
    }

    await ensureNeonClient();
    await neonClient`DELETE FROM records WHERE record_id = ${recordId}`;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            const records = await getAllRecords();
            return res.status(200).json(records);
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            const record = normalizeRecord(req.body);
            if (!record) {
                return res.status(400).json({ error: 'Missing record or record type' });
            }

            const id = getRecordId(record);
            if (!id) {
                return res.status(400).json({ error: 'Missing unique record identifier' });
            }

            await createOrUpdateRecord(record);
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const recordId = req.query.record_id || req.query.id;
            if (!recordId) {
                return res.status(400).json({ error: 'Missing record_id parameter' });
            }
            await deleteRecord(recordId);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
