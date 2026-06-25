-- ==========================================
-- 1. BẢNG TƯƠNG THÍCH NGAY (DÀNH CHO APP HIỆN TẠI)
-- ==========================================
CREATE TABLE IF NOT EXISTS app_records (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,            -- 'loan', 'fund', 'fund_transfer'
    record_id VARCHAR(100) UNIQUE,        -- borrower_id, loan_id, fund_id
    data JSONB NOT NULL,                  -- Dữ liệu JSON đầy đủ của bản ghi
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm index để truy vấn JSONB nhanh hơn
CREATE INDEX IF NOT EXISTS idx_app_records_type ON app_records(type);
CREATE INDEX IF NOT EXISTS idx_app_records_data ON app_records USING gin (data);

-- ==========================================
-- 2. CÁC BẢNG CHUẨN HÓA (DÀNH CHO ROADMAP NÂNG CẤP)
-- ==========================================

-- Bảng Khách hàng
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL, -- KH001, KH002...
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Khoản vay
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    loan_code VARCHAR(50) UNIQUE NOT NULL,     -- KV001, KV002...
    customer_code VARCHAR(50) REFERENCES customers(customer_code),
    principal NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) DEFAULT 0,
    daily_payment NUMERIC(15, 2) NOT NULL,
    total_paid NUMERIC(15, 2) DEFAULT 0,
    start_date DATE NOT NULL,
    first_payment_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',        -- 'active', 'completed'
    is_renewal BOOLEAN DEFAULT FALSE,
    previous_loan_code VARCHAR(50),
    old_debt_deducted NUMERIC(15, 2) DEFAULT 0,
    source_allocations TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Giao dịch thu tiền hàng ngày
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    loan_code VARCHAR(50) REFERENCES loans(loan_code),
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Nguồn vốn
CREATE TABLE IF NOT EXISTS funds (
    id SERIAL PRIMARY KEY,
    fund_name VARCHAR(100) UNIQUE NOT NULL,    -- 'Quỹ chung', 'Anh A'...
    fund_amount NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Chuyển tiền/biến động quỹ
CREATE TABLE IF NOT EXISTS fund_transactions (
    id SERIAL PRIMARY KEY,
    transaction_code VARCHAR(100) UNIQUE NOT NULL, -- TR-xyz
    from_fund VARCHAR(100),
    to_fund VARCHAR(100),
    amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
