let fallbackStore = globalThis.__loanFallbackStore || [];

function ensureStore() {
    if (!globalThis.__loanFallbackStore) {
        globalThis.__loanFallbackStore = [];
    }
    fallbackStore = globalThis.__loanFallbackStore;
    if (!fallbackStore.some(r => r.type === 'fund' && r.fund_name && r.fund_name.toLowerCase() === 'quỹ chung')) {
        fallbackStore.push({
            type: 'fund',
            fund_id: 'default-quy-chung',
            fund_name: 'Quỹ chung',
            fund_amount: 0
        });
    }
    return fallbackStore;
}

function getRecordId(record) {
    return record.loan_id || record.fund_id || record.fund_name || record.borrower_id || record.id || null;
}

function normalizeRecord(record) {
    if (!record || !record.type) return null;
    return record;
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

    const store = ensureStore();

    try {
        if (req.method === 'GET') {
            return res.status(200).json(store);
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

            if (req.method === 'POST') {
                store.push(record);
            } else {
                const idx = store.findIndex(item => getRecordId(item) === id);
                if (idx >= 0) store[idx] = record;
                else store.push(record);
            }

            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const recordId = req.query.record_id || req.query.id;
            if (!recordId) {
                return res.status(400).json({ error: 'Missing record_id parameter' });
            }
            const next = store.filter(item => getRecordId(item) !== recordId);
            globalThis.__loanFallbackStore = next;
            fallbackStore = next;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
