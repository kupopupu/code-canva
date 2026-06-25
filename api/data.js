const { neon } = require('@neondatabase/serverless');

// Initialize Neon client using DATABASE_URL environment variable
const sql = neon(process.env.DATABASE_URL);

module.exports = async (req, res) => {
    // Enable CORS
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
            // Retrieve all records
            const rows = await sql`SELECT data FROM app_records ORDER BY id ASC`;
            const dataArray = rows.map(r => r.data);
            return res.status(200).json(dataArray);
        }

        if (req.method === 'POST') {
            const record = req.body;
            if (!record || !record.type) {
                return res.status(400).json({ error: 'Missing record or record type' });
            }

            const type = record.type;
            const record_id = record.loan_id || record.fund_id || record.fund_name || record.borrower_id || (type + '-' + Date.now() + Math.random().toString(36).substring(2, 5));

            await sql`
                INSERT INTO app_records (type, record_id, data)
                VALUES (${type}, ${record_id}, ${record})
                ON CONFLICT (record_id) 
                DO UPDATE SET data = ${record}, updated_at = NOW()
            `;
            return res.status(200).json({ success: true });
        }

        if (req.method === 'PUT') {
            const record = req.body;
            if (!record || !record.type) {
                return res.status(400).json({ error: 'Missing record or record type' });
            }

            const record_id = record.loan_id || record.fund_id || record.fund_name || record.borrower_id;
            if (!record_id) {
                return res.status(400).json({ error: 'Missing unique record identifier' });
            }

            await sql`
                UPDATE app_records 
                SET data = ${record}, updated_at = NOW()
                WHERE record_id = ${record_id}
            `;
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const { record_id } = req.query;
            if (!record_id) {
                return res.status(400).json({ error: 'Missing record_id parameter' });
            }

            await sql`DELETE FROM app_records WHERE record_id = ${record_id}`;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
