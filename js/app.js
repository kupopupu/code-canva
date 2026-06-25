// State
let allData = [];
let currentView = 'dashboard';
let currentLoan = null;
let loanFilter = 'active';

// Helpers
const fmt = n => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);

function generateBorrowerId(name) {
    const loans = getLoans();
    const existing = loans.find(l => l.borrower_name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing && existing.borrower_id) return existing.borrower_id;
    
    let max = 0;
    loans.forEach(l => {
        if (l.borrower_id && l.borrower_id.startsWith('KH')) {
            const num = parseInt(l.borrower_id.replace('KH', ''), 10);
            if (!isNaN(num) && num > max) max = num;
        }
    });
    return 'KH' + String(max + 1).padStart(3, '0');
}

function generateLoanId() {
    const loans = getLoans();
    let max = 0;
    loans.forEach(l => {
        if (l.loan_id && l.loan_id.startsWith('KV')) {
            const num = parseInt(l.loan_id.replace('KV', ''), 10);
            if (!isNaN(num) && num > max) max = num;
        }
    });
    return 'KV' + String(max + 1).padStart(3, '0');
}

function getLoans() { return allData.filter(r => r.type === 'loan'); }
function getFunds() { return allData.filter(r => r.type === 'fund'); }
function getPayments(loanId) {
    const loan = allData.find(r => r.type === 'loan' && r.loan_id === loanId);
    if (!loan || !loan.payments_json) return [];
    try { return JSON.parse(loan.payments_json); } catch { return []; }
}

// Navigation
function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-nav="${view}"]`).classList.add('active');
    currentView = view;
    if (view === 'dashboard') renderDashboard();
    if (view === 'loans') renderLoans();
    if (view === 'funds') renderFunds();
    if (view === 'stats') renderStats();
}

function goBack() { switchView(currentView === 'detail' ? 'loans' : 'dashboard'); }

function formatCurrency(input) {
    let val = input.value.replace(/\D/g, '');
    if (val === '') { input.value = ''; return; }
    input.value = new Intl.NumberFormat('en-US').format(val);
}

function getNumericValue(str) {
    if (!str) return 0;
    return Number(str.toString().replace(/[^\d-]/g, '')) || 0;
}

function addFundRow() {
    const container = document.getElementById('fund-sources-container');
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center fund-row relative';
    row.innerHTML = `
    <div class="relative flex-1">
        <input type="text" autocomplete="off" class="input-field w-full fund-select" placeholder="Tên nguồn" required onfocus="showFundDropdown(this)" oninput="filterFundDropdown(this)" onblur="hideFundDropdown(this)">
        <div class="fund-dropdown hidden absolute z-[100] w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto mt-1 top-full left-0"></div>
    </div>
    <input type="text" class="input-field w-1/3 fund-amount" placeholder="Số tiền" required oninput="formatCurrency(this)">
    <button type="button" onclick="this.parentElement.remove()" class="p-2 bg-red-100 text-red-600 rounded-lg flex-shrink-0"><i data-lucide="minus" style="width:18px;height:18px"></i></button>
`;
    container.appendChild(row);
    lucide.createIcons();
}

// Modals
function showCreateLoanModal() {
    document.getElementById('modal-create-loan').classList.add('show');
    document.getElementById('loan-form').reset();
    document.getElementById('fund-sources-container').innerHTML = `
    <div class="flex gap-2 items-center fund-row relative">
        <div class="relative flex-1">
            <input type="text" autocomplete="off" class="input-field w-full fund-select" value="Quỹ chung" placeholder="Tên nguồn" required onfocus="showFundDropdown(this)" oninput="filterFundDropdown(this)" onblur="hideFundDropdown(this)">
            <div class="fund-dropdown hidden absolute z-[100] w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto mt-1 top-full left-0"></div>
        </div>
        <input type="text" class="input-field w-1/3 fund-amount" placeholder="Số tiền" required oninput="formatCurrency(this)">
        <button type="button" onclick="addFundRow()" class="p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0"><i data-lucide="plus" style="width:18px;height:18px"></i></button>
    </div>
`;
    document.getElementById('fund-error').classList.add('hidden');
    const tDate = today();
    document.getElementById('loan-give-date').value = tDate;
    const d = new Date(tDate);
    d.setDate(d.getDate() + 1);
    document.getElementById('loan-start-date').value = d.toISOString().slice(0, 10);
    calculateLoanInfo();
    populateFundSelect();
    populatePrevLoanSelect();
    lucide.createIcons();
}

function showAddFundModal() { document.getElementById('modal-add-fund').classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// Renewal toggle
document.querySelectorAll('[name="loan-type"]').forEach(r => {
    r.addEventListener('change', e => {
        document.getElementById('renewal-section').classList.toggle('hidden', e.target.value !== 'renewal');
    });
});

document.getElementById('prev-loan-select').addEventListener('change', e => {
    const loan = allData.find(r => r.loan_id === e.target.value);
    const info = document.getElementById('old-debt-info');
    if (loan) {
        const remaining = (loan.principal || 0) - (loan.total_paid || 0);
        info.textContent = `Nợ cũ còn: ${fmt(remaining)} - sẽ được khấu trừ`;
        info.classList.remove('hidden');
    } else { info.classList.add('hidden'); }
});

let availableFunds = [];
function populateFundSelect() {
    availableFunds = getFundBalances().map(f => f.name);
}

function showFundDropdown(input) {
    const dropdown = input.nextElementSibling;
    renderDropdownItems(input, dropdown);
    dropdown.classList.remove('hidden');
}

function filterFundDropdown(input) {
    const dropdown = input.nextElementSibling;
    renderDropdownItems(input, dropdown);
    dropdown.classList.remove('hidden');
}

function hideFundDropdown(input) {
    setTimeout(() => {
        const dropdown = input.nextElementSibling;
        if (dropdown) dropdown.classList.add('hidden');
    }, 150);
}

function renderDropdownItems(input, dropdown) {
    const val = input.value.toLowerCase();
    let filtered = availableFunds;
    if (val) {
        filtered = availableFunds.filter(f => f.toLowerCase().includes(val));
    }
    if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="px-3 py-2 text-xs text-gray-400">Nhập để tạo nguồn mới</div>`;
        return;
    }
    dropdown.innerHTML = filtered.map(f => `
        <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 transition-colors" 
             onmousedown="event.preventDefault(); this.parentElement.previousElementSibling.value = '${f}'; this.parentElement.classList.add('hidden');">
             ${f}
        </div>
    `).join('');
}

function populatePrevLoanSelect() {
    const sel = document.getElementById('prev-loan-select');
    sel.innerHTML = '<option value="">-- Chọn --</option>';
    getLoans().filter(l => l.status === 'active').forEach(l => {
        sel.innerHTML += `<option value="${l.loan_id}">${l.borrower_name} - ${fmt(l.principal)}</option>`;
    });
}

function calculateLoanInfo() {
    const principal = getNumericValue(document.getElementById('loan-principal').value);
    const duration = Number(document.getElementById('loan-duration').value) || 0;
    const interestDays = Number(document.getElementById('loan-interest-days').value) || 0;
    const startDateVal = document.getElementById('loan-start-date').value;

    if (principal > 0 && duration > 0) {
        const daily = Math.round(principal / duration);
        document.getElementById('loan-daily').value = new Intl.NumberFormat('en-US').format(daily);

        if (startDateVal) {
            const start = new Date(startDateVal);
            const totalDays = duration + interestDays;
            start.setDate(start.getDate() + totalDays);
            document.getElementById('loan-end-date').value = start.toISOString().slice(0, 10);
        }
    } else {
        document.getElementById('loan-daily').value = '';
        document.getElementById('loan-end-date').value = '';
    }
}

document.getElementById('loan-principal').addEventListener('input', function () {
    formatCurrency(this);
    calculateLoanInfo();
});
document.getElementById('loan-duration').addEventListener('input', calculateLoanInfo);
document.getElementById('loan-interest-days').addEventListener('input', calculateLoanInfo);
document.getElementById('loan-give-date').addEventListener('change', function() {
    if (this.value) {
        const d = new Date(this.value);
        d.setDate(d.getDate() + 1);
        document.getElementById('loan-start-date').value = d.toISOString().slice(0, 10);
        calculateLoanInfo();
    }
});
document.getElementById('loan-start-date').addEventListener('change', calculateLoanInfo);

// Create Loan
async function handleCreateLoan(e) {
    e.preventDefault();
    if (allData.length >= 999) { showToast('Đã đạt giới hạn dữ liệu'); return; }
    const btn = document.getElementById('btn-submit-loan');
    btn.disabled = true; btn.textContent = 'Đang tạo...';

    const loanType = document.querySelector('[name="loan-type"]:checked').value;
    const principal = getNumericValue(document.getElementById('loan-principal').value);
    const duration = Number(document.getElementById('loan-duration').value);
    const interestDays = Number(document.getElementById('loan-interest-days').value);
    const dailyPayment = principal > 0 && duration > 0 ? Math.round(principal / duration) : 0;
    const interestRate = principal > 0 ? ((interestDays * dailyPayment) / principal) * 100 : 0;

    let totalFundAmount = 0;
    let sourceAllocations = [];
    let qcUsed = 0;
    document.querySelectorAll('.fund-row').forEach(row => {
        const fundName = row.querySelector('.fund-select').value;
        const amt = getNumericValue(row.querySelector('.fund-amount').value);
        if (amt > 0) {
            totalFundAmount += amt;
            sourceAllocations.push(`${fundName}: ${fmt(amt)}`);
            if (fundName.toLowerCase() === 'quỹ chung') qcUsed += amt;
        }
    });

    const fundBalances = getFundBalances();
    const quyChung = fundBalances.find(f => f.name.toLowerCase() === 'quỹ chung');
    const qcAmount = quyChung ? quyChung.amount : 0;

    if (qcUsed > qcAmount) {
        document.getElementById('fund-error').textContent = `Quỹ chung chỉ còn ${fmt(qcAmount)}, không đủ đề xuất ${fmt(qcUsed)}. Vui lòng giảm số tiền hoặc thêm nguồn ngoài.`;
        document.getElementById('fund-error').classList.remove('hidden');
        btn.disabled = false; btn.textContent = 'Tạo khoản vay';
        return;
    }

    let oldDebt = 0;
    let prevId = '';
    if (loanType === 'renewal') {
        prevId = document.getElementById('prev-loan-select').value;
        const prev = allData.find(r => r.loan_id === prevId);
        if (prev) oldDebt = (prev.principal || 0) - (prev.total_paid || 0);
    }

    const requiredFundAmount = principal - oldDebt;

    if (totalFundAmount !== requiredFundAmount) {
        document.getElementById('fund-error').textContent = loanType === 'renewal' && oldDebt > 0
            ? `Tổng nguồn tiền phải bằng ${fmt(requiredFundAmount)} (đã trừ nợ cũ ${fmt(oldDebt)})`
            : `Tổng nguồn tiền phải bằng số tiền vay`;
        document.getElementById('fund-error').classList.remove('hidden');
        btn.disabled = false; btn.textContent = 'Tạo khoản vay';
        return;
    }
    document.getElementById('fund-error').classList.add('hidden');

    const borrowerName = document.getElementById('loan-borrower').value;
    const record = {
        type: 'loan',
        borrower_name: borrowerName,
        borrower_id: generateBorrowerId(borrowerName),
        loan_id: generateLoanId(),
        principal: principal,
        interest_rate: interestRate,
        daily_payment: dailyPayment,
        start_date: document.getElementById('loan-give-date').value,
        first_payment_date: document.getElementById('loan-start-date').value,
        end_date: document.getElementById('loan-end-date').value,
        status: 'active',
        is_renewal: loanType === 'renewal',
        previous_loan_id: prevId,
        old_debt_deducted: oldDebt,
        source_allocations: sourceAllocations.join(' | '),
        payments_json: '[]',
        total_paid: 0,
        total_interest_earned: 0,
        completed_date: '',
        fund_name: '',
        fund_amount: 0,
        notes: ''
    };

    const result = await window.dataSdk.create(record);
    btn.disabled = false; btn.textContent = 'Tạo khoản vay';
    if (result.isOk) {
        if (loanType === 'renewal' && prevId) {
            const prev = allData.find(r => r.loan_id === prevId);
            if (prev) {
                const prevPayments = JSON.parse(prev.payments_json || '[]');
                const pStart = new Date(prev.first_payment_date);
                const pEnd = new Date(prev.end_date);
                for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().slice(0, 10);
                    const dayPayments = prevPayments.filter(p => p.date === dateStr);
                    const dayTotal = dayPayments.reduce((s, p) => s + p.amount, 0);
                    if (dayTotal < prev.daily_payment) {
                        prevPayments.push({ date: dateStr, amount: prev.daily_payment - dayTotal, time: new Date().toISOString() });
                    }
                }
                prev.payments_json = JSON.stringify(prevPayments);
                prev.total_paid = prevPayments.reduce((s, p) => s + p.amount, 0);
                prev.status = 'completed';
                prev.completed_date = today();
                await window.dataSdk.update(prev);
            }
        }
        closeModal('modal-create-loan');
        document.getElementById('loan-form').reset();
        showToast('Tạo khoản vay thành công!');
    } else { showToast('Lỗi: ' + result.error.message); }
}

// Add Fund
async function handleAddFund(e) {
    e.preventDefault();
    if (allData.length >= 999) { showToast('Đã đạt giới hạn'); return; }
    const record = {
        type: 'fund',
        fund_name: document.getElementById('fund-name').value,
        fund_amount: Number(document.getElementById('fund-amount').value),
        borrower_name: '', borrower_id: '', loan_id: '', principal: 0,
        interest_rate: 0, daily_payment: 0, start_date: '', first_payment_date: '',
        end_date: '', status: '', is_renewal: false, previous_loan_id: '',
        old_debt_deducted: 0, source_allocations: '', payments_json: '',
        total_paid: 0, total_interest_earned: 0, completed_date: '', notes: ''
    };
    const result = await window.dataSdk.create(record);
    if (result.isOk) { closeModal('modal-add-fund'); document.getElementById('fund-form').reset(); showToast('Đã thêm nguồn vốn'); }
    else { showToast('Lỗi'); }
}

// Pay Debt
function openPayDebtModal(name, maxAmount) {
    const fundBalances = getFundBalances();
    const quyChung = fundBalances.find(f => f.name.toLowerCase() === 'quỹ chung');
    const qcAmount = quyChung ? quyChung.amount : 0;
    
    document.getElementById('debt-target-name').value = name;
    document.getElementById('debt-max-amount').value = maxAmount;
    document.getElementById('debt-target-label').textContent = name + ` (Nợ: ${fmt(maxAmount)})`;
    document.getElementById('debt-quy-chung-label').textContent = fmt(qcAmount);
    document.getElementById('debt-pay-amount').value = '';
    
    document.getElementById('modal-pay-debt').classList.add('show');
}

async function handlePayDebt(e) {
    e.preventDefault();
    const name = document.getElementById('debt-target-name').value;
    const maxAmount = Number(document.getElementById('debt-max-amount').value);
    const payAmount = getNumericValue(document.getElementById('debt-pay-amount').value);
    
    const fundBalances = getFundBalances();
    const quyChung = fundBalances.find(f => f.name.toLowerCase() === 'quỹ chung');
    const qcAmount = quyChung ? quyChung.amount : 0;

    if (payAmount <= 0) return;
    if (payAmount > maxAmount) {
        showToast('Số tiền trả không được lớn hơn số nợ!');
        return;
    }
    if (payAmount > qcAmount) {
        showToast('Quỹ chung không đủ tiền!');
        return;
    }

    const record = {
        type: 'fund_transfer',
        from: 'Quỹ chung',
        to: name,
        amount: payAmount,
        loan_id: 'TR-' + genId()
    };

    const result = await window.dataSdk.create(record);
    if (result.isOk) {
        closeModal('modal-pay-debt');
        showToast('Đã trả nợ thành công!');
    } else {
        showToast('Lỗi');
    }
}

// Payment
function openPaymentModal(dateStr, dayTotal) {
    if (!currentLoan) return;
    const remainingForDay = currentLoan.daily_payment - dayTotal;
    document.getElementById('payment-date').value = dateStr;
    const amtInput = document.getElementById('payment-amount');
    amtInput.value = new Intl.NumberFormat('en-US').format(remainingForDay);
    document.getElementById('payment-info').textContent = `Góp ngày: ${dateStr.split('-').reverse().join('/')} | Đã góp trong ngày: ${fmt(dayTotal)}`;
    document.getElementById('modal-payment').classList.add('show');
}

async function handlePayment(e) {
    e.preventDefault();
    const amount = getNumericValue(document.getElementById('payment-amount').value);
    const targetDate = document.getElementById('payment-date').value;
    if (!amount || !currentLoan || !targetDate) return;
    const payments = getPayments(currentLoan.loan_id);
    payments.push({ date: targetDate, amount, time: new Date().toISOString() });
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const totalRequired = currentLoan.principal * (1 + currentLoan.interest_rate / 100);
    const updatedLoan = { ...currentLoan, payments_json: JSON.stringify(payments), total_paid: totalPaid };
    if (totalPaid >= totalRequired) {
        updatedLoan.status = 'completed';
        updatedLoan.completed_date = today();
    }
    const result = await window.dataSdk.update(updatedLoan);
    if (result.isOk) { closeModal('modal-payment'); showToast('Đã ghi nhận!'); }
    else { showToast('Lỗi'); }
}

// Show loan detail
function showLoanDetail(loanId) {
    currentLoan = allData.find(r => r.loan_id === loanId);
    if (!currentLoan) return;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-detail').classList.add('active');

    const totalRequired = currentLoan.principal * (1 + currentLoan.interest_rate / 100);
    const remaining = totalRequired - (currentLoan.total_paid || 0);
    const pct = Math.min(100, Math.round(((currentLoan.total_paid || 0) / totalRequired) * 100));

    document.getElementById('detail-name').textContent = currentLoan.borrower_name;
    document.getElementById('detail-loan-id').innerHTML = `<div class="flex flex-col gap-1 items-start"><span class="bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono font-medium text-xs">Mã KH: ${currentLoan.borrower_id}</span><span class="bg-blue-50 text-blue-600 px-2 py-1 rounded font-mono font-medium text-xs">Mã vay: ${currentLoan.loan_id}</span></div>`;
    document.getElementById('detail-principal').textContent = fmt(currentLoan.principal);
    document.getElementById('detail-rate').textContent = currentLoan.interest_rate + '%';
    document.getElementById('detail-daily').textContent = fmt(currentLoan.daily_payment);
    document.getElementById('detail-start').textContent = currentLoan.first_payment_date;
    document.getElementById('detail-paid').textContent = fmt(currentLoan.total_paid);
    document.getElementById('detail-remaining').textContent = fmt(Math.max(0, remaining));
    document.getElementById('detail-progress-pct').textContent = pct + '%';
    document.getElementById('detail-progress-bar').style.width = pct + '%';
    document.getElementById('detail-status').textContent = currentLoan.status === 'active' ? 'Đang vay' : 'Hoàn thành';
    document.getElementById('detail-status').className = 'tag ' + (currentLoan.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700');

    renderPaymentGrid();
}

function getLunarDate(d) {
    try {
        const f = new Intl.DateTimeFormat('en-US-u-ca-chinese', { day: 'numeric', month: 'numeric' });
        const p = f.formatToParts(d);
        const dd = p.find(x => x.type === 'day')?.value;
        const mm = p.find(x => x.type === 'month')?.value;
        if (dd && mm) return `Âm lịch: ${dd}/${mm}`;
    } catch (e) { }
    return '';
}

function renderPaymentGrid() {
    const grid = document.getElementById('payment-grid');
    grid.innerHTML = '';
    if (!currentLoan) return;
    const start = new Date(currentLoan.first_payment_date);
    const end = new Date(currentLoan.end_date);
    const payments = getPayments(currentLoan.loan_id);
    const todayDate = today();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const dayPayments = payments.filter(p => p.date === dateStr);
        const dayTotal = dayPayments.reduce((s, p) => s + p.amount, 0);
        let cls = 'payment-pending';
        if (dayTotal >= currentLoan.daily_payment) cls = 'payment-paid';
        else if (dayTotal > 0) cls = 'payment-partial';
        else if (dateStr < todayDate) cls = 'payment-overdue';

        const cell = document.createElement('div');
        cell.className = `payment-cell ${cls}`;
        const remaining = currentLoan.daily_payment - dayTotal;
        let subContent = '';
        if (dayTotal >= currentLoan.daily_payment) {
            subContent = `<i data-lucide="check" style="width:16px;height:16px;stroke-width:3"></i>`;
        } else {
            const shortAmt = remaining >= 1000000 ? (remaining / 1000000).toFixed(1).replace('.0', '') + 'tr' : (remaining >= 1000 ? (remaining / 1000) + 'k' : remaining);
            subContent = dayTotal > 0 ? `-${shortAmt}` : shortAmt;
        }
        const dayMonth = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const lunarStr = getLunarDate(d);
        cell.innerHTML = `<span>${dayMonth}</span><div class="lunar-date">${lunarStr}</div><div class="payment-subtext flex items-center justify-center opacity-80 mt-1">${subContent}</div>`;
        cell.title = `${dateStr}: ${fmt(dayTotal)}`;
        if (dayTotal < currentLoan.daily_payment) {
            cell.onclick = () => openPaymentModal(dateStr, dayTotal);
        } else {
            cell.onclick = () => showToast(`Ngày ${dateStr.split('-').reverse().join('/')} đã hoàn thành`);
        }
        grid.appendChild(cell);
    }
    lucide.createIcons();
}

// Renders
function renderDashboard() {
    const loans = getLoans().filter(l => l.status === 'active');
    const totalLending = loans.reduce((s, l) => s + (l.principal || 0), 0);
    const totalDebt = loans.reduce((s, l) => s + ((l.principal * (1 + l.interest_rate / 100)) - (l.total_paid || 0)), 0);
    
    const fundBalances = getFundBalances();
    const quyChung = fundBalances.find(f => f.name.toLowerCase() === 'quỹ chung');
    const fundBalance = quyChung ? quyChung.amount : 0;
    const externalDebt = fundBalances.filter(f => f.name.toLowerCase() !== 'quỹ chung' && f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0);

    document.getElementById('val-total-lending').textContent = fmt(totalLending);
    document.getElementById('val-total-debt').textContent = fmt(Math.max(0, totalDebt));
    document.getElementById('val-fund-balance').textContent = fmt(fundBalance);
    document.getElementById('val-external-debt').textContent = fmt(externalDebt);

    let expectedToday = 0;
    let collectedToday = 0;
    let pendingListHtml = '';
    const tDate = today();

    loans.forEach(l => {
        const start = new Date(l.first_payment_date);
        const end = new Date(l.end_date);
        const tObj = new Date(tDate);
        if (tObj >= start && tObj <= end) {
            expectedToday += l.daily_payment;
            const payments = JSON.parse(l.payments_json || '[]');
            const dayPayments = payments.filter(p => p.date === tDate);
            const dayTotal = dayPayments.reduce((s, p) => s + p.amount, 0);
            collectedToday += dayTotal;

            const daysPassed = Math.floor((tObj - start) / (1000 * 60 * 60 * 24)) + 1;
            const expectedTotalUntilToday = daysPassed * l.daily_payment;
            const currentDebt = expectedTotalUntilToday - (l.total_paid || 0);

            if (currentDebt > 0) {
                let balance = l.total_paid || 0;
                let missedDates = [];
                let d = new Date(start);
                for (let i = 0; i < daysPassed; i++) {
                    balance -= l.daily_payment;
                    if (balance < 0) {
                        const displayDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                        missedDates.push(displayDate);
                    }
                    d.setDate(d.getDate() + 1);
                }

                let missedText = '';
                if (missedDates.length > 0) {
                    let mText = missedDates.join(', ');
                    if (missedDates.length > 3) {
                        mText = missedDates.slice(0, 2).join(', ') + ', ... ' + missedDates[missedDates.length - 1];
                    }
                    missedText = `<p class="text-[10px] text-gray-400 mt-0.5">(Chưa góp: ${mText})</p>`;
                }

                pendingListHtml += `<div class="relative overflow-hidden mb-3" style="border-radius:16px;">
                <div class="absolute inset-y-0 right-0 flex items-center justify-end w-full bg-green-500 text-white" style="border-radius:16px;">
                    <button onclick="quickPayToday('${l.loan_id}', ${currentDebt})" class="flex flex-col items-center justify-center w-[90px] h-full">
                        <i data-lucide="check-circle" style="width:24px;height:24px"></i>
                        <span class="text-xs mt-1 font-medium">Góp đủ</span>
                    </button>
                </div>
                <div class="borrower-card swipeable-card relative z-10 hover:bg-gray-50 !items-start transition-transform duration-300" 
                     onclick="if(!this.dataset.swiping) showLoanDetail('${l.loan_id}')"
                     ontouchstart="handleTouchStart(event, this)" 
                     ontouchmove="handleTouchMove(event, this)" 
                     ontouchend="handleTouchEnd(event, this)"
                     style="margin-bottom:0">
                    <div>
                        <p class="font-semibold text-sm text-gray-800">${l.borrower_name}</p>
                        <div class="flex flex-col items-start gap-1 mt-1.5">
                            <span class="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-mono max-w-[120px] truncate" title="Mã KH">${l.borrower_id}</span>
                            <span class="bg-blue-50 text-blue-500 text-[10px] px-1.5 py-0.5 rounded font-mono max-w-[120px] truncate" title="Mã vay">${l.loan_id}</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end text-right">
                        <div class="flex items-center gap-1">
                            <p class="text-[15px] font-bold text-red-500">${fmt(currentDebt)}</p>
                            <div class="text-gray-300"><i data-lucide="chevron-right" style="width:18px;height:18px"></i></div>
                        </div>
                        <p class="text-[10px] text-gray-500 font-medium mt-1">Cần góp hôm nay</p>
                        ${missedText}
                    </div>
                </div>
            </div>`;
            }
        }
    });

    const elExpected = document.getElementById('dash-today-expected');
    if (elExpected) {
        elExpected.textContent = fmt(expectedToday);
        document.getElementById('dash-today-collected').textContent = fmt(collectedToday);
        const pct = expectedToday > 0 ? Math.min(100, Math.round((collectedToday / expectedToday) * 100)) : (collectedToday > 0 ? 100 : 0);
        document.getElementById('dash-today-pct').textContent = pct + '%';
        document.getElementById('dash-today-progress').style.width = pct + '%';

        const listEl = document.getElementById('dash-pending-list');
        const noMsgEl = document.getElementById('dash-no-pending');
        if (pendingListHtml) {
            listEl.innerHTML = pendingListHtml;
            noMsgEl.classList.add('hidden');
        } else if (expectedToday > 0) {
            listEl.innerHTML = '';
            noMsgEl.textContent = 'Đã thu đủ hết hôm nay! 🎉';
            noMsgEl.classList.remove('hidden');
        } else {
            listEl.innerHTML = '';
            noMsgEl.textContent = 'Không có lịch thu hôm nay';
            noMsgEl.classList.remove('hidden');
        }
    }
    lucide.createIcons();
}

function renderLoans() {
    const loans = getLoans().filter(l => l.status === (loanFilter === 'active' ? 'active' : 'completed'));
    const list = document.getElementById('loans-list');
    const noMsg = document.getElementById('no-loans');
    if (loans.length === 0) { list.innerHTML = ''; noMsg.style.display = ''; return; }
    noMsg.style.display = 'none';
    list.innerHTML = loans.map(l => `<div class="borrower-card" onclick="showLoanDetail('${l.loan_id}')">
    <div>
        <p class="font-semibold text-sm">${l.borrower_name}</p>
        <div class="flex flex-col items-start gap-1 mt-1.5">
            <span class="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-mono max-w-[120px] truncate" title="Mã KH">${l.borrower_id}</span>
            <span class="bg-blue-50 text-blue-500 text-[10px] px-1.5 py-0.5 rounded font-mono max-w-[120px] truncate" title="Mã vay">${l.loan_id}</span>
        </div>
    </div>
    <div class="text-right flex flex-col items-end"><p class="text-sm font-semibold">${fmt(l.principal)}</p><span class="tag ${l.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'} text-[10px] mt-1">${l.status === 'active' ? 'Đang vay' : 'Hoàn thành'}</span></div>
</div>`).join('');
}

function filterLoans(f) { loanFilter = f; renderLoans(); }

function getFundBalances() {
    const funds = getFunds();
    const loans = getLoans();
    const balances = {};
    funds.forEach(f => { balances[f.fund_name.toLowerCase()] = { name: f.fund_name, amount: f.fund_amount || 0 }; });
    if (!balances['quỹ chung']) balances['quỹ chung'] = { name: 'Quỹ chung', amount: 0 };

    let totalCollected = 0;
    loans.forEach(l => {
        totalCollected += (l.total_paid || 0);
        if (l.source_allocations) {
            l.source_allocations.split(' | ').forEach(p => {
                const parts = p.split(': ');
                if (parts.length === 2) {
                    const name = parts[0];
                    const amt = getNumericValue(parts[1]);
                    const key = name.toLowerCase();
                    if (!balances[key]) balances[key] = { name: name, amount: 0 };
                    balances[key].amount -= amt;
                }
            });
        }
    });

    balances['quỹ chung'].amount += totalCollected;
    if (balances['quỹ chung'].amount < 0) balances['quỹ chung'].amount = 0;

    return Object.values(balances);
}

function renderFunds() {
    const fundBalances = getFundBalances();
    const list = document.getElementById('funds-list');
    if (fundBalances.length === 0) { list.innerHTML = '<p class="text-center text-gray-400 py-4 text-sm">Chưa có nguồn vốn nào</p>'; return; }
    list.innerHTML = fundBalances.map(f => {
        const color = f.amount < 0 ? 'text-red-500' : 'text-blue-600';
        let actionBtn = '';
        if (f.amount < 0 && f.name.toLowerCase() !== 'quỹ chung') {
            actionBtn = `<button onclick="openPayDebtModal('${f.name}', ${Math.abs(f.amount)})" class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded mt-1">Trả nợ</button>`;
        }
        return `<div class="card p-3 mb-2 flex justify-between items-center">
    <div>
        <p class="font-semibold text-sm">${f.name}</p>
        ${actionBtn}
    </div>
    <p class="font-bold ${color}">${fmt(f.amount)}</p>
</div>`}).join('');
}

function renderStats() {
    const loans = getLoans();
    const totalPrincipal = loans.reduce((s, l) => s + (l.principal || 0), 0);
    const totalExpInterest = loans.reduce((s, l) => s + (l.principal * l.interest_rate / 100), 0);
    const totalCollected = loans.reduce((s, l) => {
        const interest = Math.max(0, (l.total_paid || 0) - l.principal);
        return s + interest;
    }, 0);
    document.getElementById('stat-principal').textContent = fmt(totalPrincipal);
    document.getElementById('stat-expected-interest').textContent = fmt(totalExpInterest);
    document.getElementById('stat-collected-interest').textContent = fmt(totalCollected);
    document.getElementById('stat-pending-interest').textContent = fmt(totalExpInterest - totalCollected);

    const active = loans.filter(l => l.status === 'active');
    if (active.length > 0) {
        const top = active.sort((a, b) => {
            const ra = (a.principal * (1 + a.interest_rate / 100)) - (a.total_paid || 0);
            const rb = (b.principal * (1 + b.interest_rate / 100)) - (b.total_paid || 0);
            return rb - ra;
        })[0];
        document.getElementById('stat-top-debtor').textContent = `${top.borrower_name} (${fmt((top.principal * (1 + top.interest_rate / 100)) - (top.total_paid || 0))})`;
    }
}

function filterStats(period) { renderStats(); }

// Toast
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'fixed top-16 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-[100] shadow-lg';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// Swipe and QuickPay
let swipeStartX = 0;
let swipeCurrentX = 0;

function handleTouchStart(e, el) {
    swipeStartX = e.touches[0].clientX;
    el.style.transition = 'none';
    el.dataset.swiping = '';
}

function handleTouchMove(e, el) {
    swipeCurrentX = e.touches[0].clientX;
    const diff = swipeCurrentX - swipeStartX;
    if (diff < 0 && diff > -120) {
        el.style.transform = `translateX(${diff}px)`;
        if (Math.abs(diff) > 10) el.dataset.swiping = 'true';
    }
}

function handleTouchEnd(e, el) {
    el.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    const diff = swipeCurrentX - swipeStartX;
    if (diff < -50) {
        el.style.transform = `translateX(-90px)`;
    } else {
        el.style.transform = `translateX(0px)`;
        setTimeout(() => { delete el.dataset.swiping; }, 300);
    }
    swipeStartX = 0;
    swipeCurrentX = 0;
}

async function quickPayToday(loanId, amount) {
    if (!confirm('Xác nhận đã thu đủ ' + fmt(amount) + '?')) {
        document.querySelectorAll('.swipeable-card').forEach(c => c.style.transform = 'translateX(0px)');
        return;
    }
    const currentLoanLocal = allData.find(r => r.loan_id === loanId);
    if (!currentLoanLocal) return;

    const tDate = today();
    const payments = JSON.parse(currentLoanLocal.payments_json || '[]');
    payments.push({ date: tDate, amount: amount, time: new Date().toISOString() });
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const totalRequired = currentLoanLocal.principal * (1 + currentLoanLocal.interest_rate / 100);
    const updatedLoan = { ...currentLoanLocal, payments_json: JSON.stringify(payments), total_paid: totalPaid };
    if (totalPaid >= totalRequired) {
        updatedLoan.status = 'completed';
        updatedLoan.completed_date = today();
    }
    const result = await window.dataSdk.update(updatedLoan);
    if (result.isOk) {
        showToast('Đã ghi nhận!');
    } else {
        showToast('Lỗi ghi nhận!');
    }
}

// Window bindings
window.generateBorrowerId = generateBorrowerId;
window.generateLoanId = generateLoanId;
window.getLoans = getLoans;
window.getFunds = getFunds;
window.getPayments = getPayments;
window.switchView = switchView;
window.goBack = goBack;
window.formatCurrency = formatCurrency;
window.getNumericValue = getNumericValue;
window.addFundRow = addFundRow;
window.showCreateLoanModal = showCreateLoanModal;
window.showAddFundModal = showAddFundModal;
window.closeModal = closeModal;
window.populateFundSelect = populateFundSelect;
window.showFundDropdown = showFundDropdown;
window.filterFundDropdown = filterFundDropdown;
window.hideFundDropdown = hideFundDropdown;
window.renderDropdownItems = renderDropdownItems;
window.populatePrevLoanSelect = populatePrevLoanSelect;
window.calculateLoanInfo = calculateLoanInfo;
window.handleCreateLoan = handleCreateLoan;
window.handleAddFund = handleAddFund;
window.openPayDebtModal = openPayDebtModal;
window.handlePayDebt = handlePayDebt;
window.openPaymentModal = openPaymentModal;
window.handlePayment = handlePayment;
window.showLoanDetail = showLoanDetail;
window.getLunarDate = getLunarDate;
window.renderPaymentGrid = renderPaymentGrid;
window.renderDashboard = renderDashboard;
window.renderLoans = renderLoans;
window.filterLoans = filterLoans;
window.getFundBalances = getFundBalances;
window.renderFunds = renderFunds;
window.renderStats = renderStats;
window.filterStats = filterStats;
window.showToast = showToast;
window.handleTouchStart = handleTouchStart;
window.handleTouchMove = handleTouchMove;
window.handleTouchEnd = handleTouchEnd;
window.quickPayToday = quickPayToday;

// ==========================================
// KẾT NỐI VÀ KHỞI TẠO DỮ LIỆU (DATABASE SDK)
// ==========================================

if (!window.dataSdk) {
    window.dataSdk = {
        data: [],
        async fetchAll() {
            try {
                const res = await fetch('/api/data');
                if (res.ok) {
                    this.data = await res.json();
                    if (this.handler) this.handler.onDataChanged(this.data);
                }
            } catch (e) {
                console.error('Error fetching data:', e);
                showToast('Không kết nối được cơ sở dữ liệu!');
            }
        },
        async create(record) {
            try {
                const res = await fetch('/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
                if (res.ok) {
                    await this.fetchAll();
                    return { isOk: true };
                }
                const err = await res.json();
                return { isOk: false, error: err };
            } catch (e) {
                console.error('Error creating record:', e);
                return { isOk: false, error: e };
            }
        },
        async update(record) {
            try {
                const res = await fetch('/api/data', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
                if (res.ok) {
                    await this.fetchAll();
                    return { isOk: true };
                }
                const err = await res.json();
                return { isOk: false, error: err };
            } catch (e) {
                console.error('Error updating record:', e);
                return { isOk: false, error: e };
            }
        },
        async init(handler) {
            this.handler = handler;
            if (window.location.protocol === 'file:') {
                console.log('Running as local file, using LocalStorage fallback.');
                const stored = JSON.parse(localStorage.getItem('loan_data') || '[]');
                if (!stored.find(r => r.type === 'fund' && r.fund_name.toLowerCase() === 'quỹ chung')) {
                    stored.push({
                        type: 'fund',
                        fund_id: 'default-quy-chung',
                        fund_name: 'Quỹ chung',
                        fund_amount: 0
                    });
                    localStorage.setItem('loan_data', JSON.stringify(stored));
                }
                this.data = stored;
                this.save = function() {
                    localStorage.setItem('loan_data', JSON.stringify(this.data));
                    if (this.handler) this.handler.onDataChanged(this.data);
                };
                this.create = async function(rec) {
                    this.data.push(rec);
                    this.save();
                    return { isOk: true };
                };
                this.update = async function(rec) {
                    const idx = this.data.findIndex(r => r.loan_id === rec.loan_id);
                    if (idx !== -1) {
                        this.data[idx] = rec;
                        this.save();
                    }
                    return { isOk: true };
                };
                setTimeout(() => handler.onDataChanged(this.data), 0);
                return { isOk: true };
            }

            await this.fetchAll();
            return { isOk: true };
        }
    };
}

const dataHandler = {
    onDataChanged(data) {
        allData = data;
        renderDashboard();
        if (currentView === 'loans') renderLoans();
        if (currentView === 'funds') renderFunds();
        if (currentView === 'stats') renderStats();
        if (currentLoan) {
            currentLoan = data.find(r => r.loan_id === currentLoan.loan_id);
            if (currentLoan && document.getElementById('view-detail').classList.contains('active')) {
                showLoanDetail(currentLoan.loan_id);
            }
        }
    }
};

(async () => {
    const result = await window.dataSdk.init(dataHandler);
    if (!result.isOk) showToast('Lỗi kết nối dữ liệu');
    lucide.createIcons();
})();

