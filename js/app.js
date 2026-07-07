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
    const existing = loans.find(l => l.borrower_name && l.borrower_name.trim().toLowerCase() === name.trim().toLowerCase());
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

function goBack() { switchView(currentView); }

function formatCurrency(input) {
    let val = input.value.replace(/\D/g, '');
    if (val === '') { input.value = ''; return; }
    input.value = new Intl.NumberFormat('en-US').format(val);
}

function getNumericValue(str) {
    if (!str) return 0;
    return Number(str.toString().replace(/[^\d-]/g, '')) || 0;
}

function updateFundBalancesLabels() {
    const fundRows = document.querySelectorAll('.fund-row');
    const balances = getFundBalances();
    fundRows.forEach(row => {
        const selectEl = row.querySelector('.fund-select');
        const labelEl = row.querySelector('.fund-balance-label');
        if (!selectEl || !labelEl) return;
        
        const fundName = selectEl.value.trim().toLowerCase();
        if (!fundName) {
            labelEl.textContent = 'Còn: 0đ';
            return;
        }
        
        const fund = balances.find(f => f.name.toLowerCase() === fundName);
        const amount = fund ? fund.amount : 0;
        labelEl.textContent = `Còn: ${fmt(amount)}`;
    });
}
window.updateFundBalancesLabels = updateFundBalancesLabels;

function addFundRow() {
    const container = document.getElementById('fund-sources-container');
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center fund-row relative mt-4';
    row.innerHTML = `
    <div class="relative flex-1">
        <input type="text" autocomplete="off" class="input-field w-full fund-select" placeholder="Tên nguồn" required onfocus="showFundDropdown(this)" oninput="filterFundDropdown(this); updateFundBalancesLabels();" onblur="hideFundDropdown(this)">
        <div class="fund-dropdown hidden absolute z-[100] w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto mt-1 top-full left-0"></div>
    </div>
    <div class="relative w-1/3">
        <span class="fund-balance-label absolute -top-4 right-1 text-[10px] text-gray-500 font-medium whitespace-nowrap">Còn: 0đ</span>
        <input type="text" inputmode="numeric" class="input-field w-full fund-amount" placeholder="Số tiền" required oninput="formatCurrency(this)">
    </div>
    <button type="button" onclick="this.parentElement.remove()" class="p-2 bg-red-100 text-red-600 rounded-lg flex-shrink-0"><i data-lucide="minus" style="width:18px;height:18px"></i></button>
`;
    container.appendChild(row);
    lucide.createIcons();
    updateFundBalancesLabels();
}

// Modals
function showCreateLoanModal() {
    document.getElementById('modal-create-loan').classList.add('show');
    document.getElementById('loan-form').reset();
    document.getElementById('fund-sources-container').innerHTML = `
    <div class="flex gap-2 items-center fund-row relative mt-4">
        <div class="relative flex-1">
            <input type="text" autocomplete="off" class="input-field w-full fund-select" value="Quỹ chung" placeholder="Tên nguồn" required onfocus="showFundDropdown(this)" oninput="filterFundDropdown(this); updateFundBalancesLabels();" onblur="hideFundDropdown(this)">
            <div class="fund-dropdown hidden absolute z-[100] w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto mt-1 top-full left-0"></div>
        </div>
        <div class="relative w-1/3">
            <span class="fund-balance-label absolute -top-4 right-1 text-[10px] text-gray-500 font-medium whitespace-nowrap">Còn: 0đ</span>
            <input type="text" inputmode="numeric" class="input-field w-full fund-amount" placeholder="Số tiền" required oninput="formatCurrency(this)">
        </div>
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
    updateFundBalancesLabels();
}

function showAddFundModal() { document.getElementById('modal-add-fund').classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function updateAmountToGive() {
    const loanType = document.querySelector('[name="loan-type"]:checked').value;
    const principal = getNumericValue(document.getElementById('loan-principal').value) || 0;
    let oldDebt = 0;
    if (loanType === 'renewal') {
        const prevId = document.getElementById('prev-loan-select').value;
        const prev = allData.find(r => r.loan_id === prevId);
        if (prev) {
            const totalRequired = prev.principal * (1 + prev.interest_rate / 100);
            oldDebt = Math.round(totalRequired - (prev.total_paid || 0));
        }
    }
    const giveAmount = Math.max(0, principal - oldDebt);
    document.getElementById('amount-to-give-display').textContent = fmt(giveAmount);
}

// Renewal toggle
document.querySelectorAll('[name="loan-type"]').forEach(r => {
    r.addEventListener('change', e => {
        document.getElementById('renewal-section').classList.toggle('hidden', e.target.value !== 'renewal');
        updateAmountToGive();
    });
});

document.getElementById('prev-loan-select').addEventListener('change', e => {
    const loan = allData.find(r => r.loan_id === e.target.value);
    const info = document.getElementById('old-debt-info');
    if (loan) {
        const totalRequired = loan.principal * (1 + loan.interest_rate / 100);
        const remaining = Math.round(totalRequired - (loan.total_paid || 0));
        info.textContent = `Nợ cũ còn: ${fmt(remaining)} - sẽ được khấu trừ`;
        info.classList.remove('hidden');
    } else { info.classList.add('hidden'); }
    updateAmountToGive();
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
             onmousedown="event.preventDefault(); const inp = this.parentElement.previousElementSibling; inp.value = '${f}'; this.parentElement.classList.add('hidden'); updateFundBalancesLabels();">
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
            start.setDate(start.getDate() + totalDays - 1);
            document.getElementById('loan-end-date').value = start.toISOString().slice(0, 10);
        }
    } else {
        document.getElementById('loan-daily').value = '';
        document.getElementById('loan-end-date').value = '';
    }
    updateAmountToGive();
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
    
    // Validate that computed fields are populated
    const endDate = document.getElementById('loan-end-date').value;
    if (!endDate) {
        showToast('Vui lòng điền đầy đủ thông tin: Số ngày góp gốc và Số ngày lãi phải > 0');
        return;
    }
    
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
        if (prev) {
            const totalRequired = prev.principal * (1 + prev.interest_rate / 100);
            oldDebt = Math.round(totalRequired - (prev.total_paid || 0));
        }
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
                let currentPaid = prevPayments.reduce((s, p) => s + p.amount, 0);
                const totalReq = prev.principal * (1 + prev.interest_rate / 100);
                for (let d = new Date(pStart); d <= pEnd && currentPaid < totalReq; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().slice(0, 10);
                    const dayPayments = prevPayments.filter(p => p.date === dateStr);
                    const dayTotal = dayPayments.reduce((s, p) => s + p.amount, 0);
                    if (dayTotal < prev.daily_payment) {
                        const amountToAdd = Math.min(prev.daily_payment - dayTotal, totalReq - currentPaid);
                        prevPayments.push({ date: dateStr, amount: amountToAdd, time: new Date().toISOString() });
                        currentPaid += amountToAdd;
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
    } else { showToast('Lỗi: ' + (result.error.error || result.error.message || JSON.stringify(result.error))); }
}

// Autocomplete Suggestions
function getUniqueBorrowers() {
    const loans = getLoans();
    const map = new Map();
    loans.forEach(l => {
        if (l.borrower_name) {
            map.set(l.borrower_name.toLowerCase(), l.borrower_name);
        }
    });
    return Array.from(map.values());
}

function showBorrowerSuggestions(input, type = 'create') {
    const val = input.value.toLowerCase();
    const dropdown = type === 'create' ? document.getElementById('borrower-suggestions') : document.getElementById('edit-borrower-suggestions');
    if (!dropdown) return;
    
    const borrowers = getUniqueBorrowers();
    let filtered = borrowers;
    if (val) {
        filtered = borrowers.filter(b => b.toLowerCase().includes(val));
    }
    
    if (filtered.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }
    
    dropdown.innerHTML = filtered.map(b => `
        <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 transition-colors" 
             onmousedown="event.preventDefault(); document.getElementById('${input.id}').value = '${b}'; document.getElementById('${dropdown.id}').classList.add('hidden');">
             ${b}
        </div>
    `).join('');
    dropdown.classList.remove('hidden');
}

function hideBorrowerSuggestions(input) {
    setTimeout(() => {
        const dropdown = input.nextElementSibling;
        if (dropdown) dropdown.classList.add('hidden');
    }, 150);
}

// Edit Loan
function openEditLoanModal() {
    if (!currentLoan) return;
    document.getElementById('edit-loan-id').value = currentLoan.loan_id;
    document.getElementById('edit-loan-borrower').value = currentLoan.borrower_name;
    
    const duration = Math.round(currentLoan.principal / currentLoan.daily_payment) || 0;
    const totalRequired = currentLoan.principal * (1 + currentLoan.interest_rate / 100);
    const interestAmt = totalRequired - currentLoan.principal;
    const interestDays = interestAmt > 0 ? Math.round(interestAmt / currentLoan.daily_payment) : 0;

    let giveDate = currentLoan.start_date;
    if (!giveDate) {
        const d = new Date(currentLoan.first_payment_date);
        d.setDate(d.getDate() - 1);
        giveDate = d.toISOString().slice(0, 10);
    }

    document.getElementById('edit-loan-give-date').value = giveDate;
    document.getElementById('edit-loan-start-date').value = currentLoan.first_payment_date;
    document.getElementById('edit-loan-principal').value = new Intl.NumberFormat('en-US').format(currentLoan.principal);
    document.getElementById('edit-loan-duration').value = duration;
    document.getElementById('edit-loan-interest-days').value = interestDays;
    
    calculateEditLoanInfo();
    document.getElementById('modal-edit-loan').classList.add('show');
}

function calculateEditLoanInfo() {
    const principal = getNumericValue(document.getElementById('edit-loan-principal').value);
    const duration = Number(document.getElementById('edit-loan-duration').value) || 0;
    const interestDays = Number(document.getElementById('edit-loan-interest-days').value) || 0;
    const startDateVal = document.getElementById('edit-loan-start-date').value;

    if (principal > 0 && duration > 0) {
        const daily = Math.round(principal / duration);
        document.getElementById('edit-loan-daily').value = new Intl.NumberFormat('en-US').format(daily);

        if (startDateVal) {
            const start = new Date(startDateVal);
            const totalDays = duration + interestDays;
            start.setDate(start.getDate() + totalDays - 1);
            document.getElementById('edit-loan-end-date').value = start.toISOString().slice(0, 10);
        }
    } else {
        document.getElementById('edit-loan-daily').value = '';
        document.getElementById('edit-loan-end-date').value = '';
    }
}

document.getElementById('edit-loan-give-date').addEventListener('change', function() {
    if (this.value) {
        const d = new Date(this.value);
        d.setDate(d.getDate() + 1);
        document.getElementById('edit-loan-start-date').value = d.toISOString().slice(0, 10);
        calculateEditLoanInfo();
    }
});
document.getElementById('edit-loan-start-date').addEventListener('change', calculateEditLoanInfo);

async function handleEditLoan(e) {
    e.preventDefault();
    
    // Validate that computed fields are populated
    const endDate = document.getElementById('edit-loan-end-date').value;
    if (!endDate) {
        showToast('Vui lòng điền đầy đủ thông tin: Số ngày góp gốc và Số ngày lãi phải > 0');
        return;
    }
    
    const btn = document.getElementById('btn-submit-edit-loan');
    btn.disabled = true; btn.textContent = 'Đang lưu...';

    const principal = getNumericValue(document.getElementById('edit-loan-principal').value);
    const duration = Number(document.getElementById('edit-loan-duration').value);
    const interestDays = Number(document.getElementById('edit-loan-interest-days').value);
    const dailyPayment = principal > 0 && duration > 0 ? Math.round(principal / duration) : 0;
    const interestRate = principal > 0 ? ((interestDays * dailyPayment) / principal) * 100 : 0;
    const borrowerName = document.getElementById('edit-loan-borrower').value;

    const updatedLoan = {
        ...currentLoan,
        borrower_name: borrowerName,
        principal: principal,
        interest_rate: interestRate,
        daily_payment: dailyPayment,
        start_date: document.getElementById('edit-loan-give-date').value,
        first_payment_date: document.getElementById('edit-loan-start-date').value,
        end_date: document.getElementById('edit-loan-end-date').value
    };

    const totalRequired = principal * (1 + interestRate / 100);
    if ((updatedLoan.total_paid || 0) >= totalRequired) {
        updatedLoan.status = 'completed';
        if (!updatedLoan.completed_date) updatedLoan.completed_date = today();
    } else {
        updatedLoan.status = 'active';
        updatedLoan.completed_date = '';
    }

    const result = await window.dataSdk.update(updatedLoan);
    btn.disabled = false; btn.textContent = 'Lưu thay đổi';
    if (result.isOk) {
        closeModal('modal-edit-loan');
        showToast('Đã cập nhật khoản vay!');
        currentLoan = updatedLoan;
        showLoanDetail(currentLoan.loan_id);
    } else { 
        showToast('Lỗi: ' + (result.error?.message || 'Không xác định')); 
    }
}

// Add Fund
async function handleAddFund(e) {
    e.preventDefault();
    if (allData.length >= 999) { showToast('Đã đạt giới hạn'); return; }
    const nameInput = document.getElementById('fund-name').value.trim();
    const amountInput = Number(document.getElementById('fund-amount').value);
    
    const existing = allData.find(r => r.type === 'fund' && r.fund_name.toLowerCase() === nameInput.toLowerCase());
    
    let record;
    if (existing) {
        record = {
            ...existing,
            fund_amount: (existing.fund_amount || 0) + amountInput
        };
    } else {
        record = {
            type: 'fund',
            fund_name: nameInput,
            fund_amount: amountInput,
            borrower_name: '', borrower_id: '', loan_id: '', principal: 0,
            interest_rate: 0, daily_payment: 0, start_date: '', first_payment_date: '',
            end_date: '', status: '', is_renewal: false, previous_loan_id: '',
            old_debt_deducted: 0, source_allocations: '', payments_json: '',
            total_paid: 0, total_interest_earned: 0, completed_date: '', notes: ''
        };
    }

    const result = await (existing ? window.dataSdk.update(record) : window.dataSdk.create(record));
    if (result.isOk) { closeModal('modal-add-fund'); document.getElementById('fund-form').reset(); showToast('Đã thêm nguồn vốn'); }
    else { showToast('Lỗi'); }
}

function openAddMoneyModal(name) {
    document.getElementById('add-money-fund-name').value = name;
    document.getElementById('add-money-fund-label').textContent = name;
    document.getElementById('add-money-amount').value = '';
    document.getElementById('modal-add-money').classList.add('show');
}

async function handleAddMoney(e) {
    e.preventDefault();
    const name = document.getElementById('add-money-fund-name').value;
    const amount = getNumericValue(document.getElementById('add-money-amount').value);
    if (amount <= 0) return;

    const existing = allData.find(r => r.type === 'fund' && r.fund_name.toLowerCase() === name.toLowerCase());
    
    let record;
    if (existing) {
        record = {
            ...existing,
            fund_amount: (existing.fund_amount || 0) + amount
        };
    } else {
        record = {
            type: 'fund',
            fund_name: name,
            fund_amount: amount,
            borrower_name: '', borrower_id: '', loan_id: '', principal: 0,
            interest_rate: 0, daily_payment: 0, start_date: '', first_payment_date: '',
            end_date: '', status: '', is_renewal: false, previous_loan_id: '',
            old_debt_deducted: 0, source_allocations: '', payments_json: '',
            total_paid: 0, total_interest_earned: 0, completed_date: '', notes: ''
        };
    }

    const result = await (existing ? window.dataSdk.update(record) : window.dataSdk.create(record));
    if (result.isOk) {
        closeModal('modal-add-money');
        showToast('Đã thêm tiền vào quỹ thành công!');
    } else {
        showToast('Lỗi khi thêm tiền');
    }
}

function openEditFundBalanceModal(name, currentAmount) {
    document.getElementById('edit-fund-name').value = name;
    document.getElementById('edit-fund-label').textContent = name;
    document.getElementById('edit-fund-current').textContent = fmt(currentAmount);
    document.getElementById('edit-fund-amount').value = new Intl.NumberFormat('en-US').format(Math.max(0, currentAmount));
    document.getElementById('modal-edit-fund-balance').classList.add('show');
}

async function handleEditFundBalance(e) {
    e.preventDefault();
    const name = document.getElementById('edit-fund-name').value;
    const targetAmount = getNumericValue(document.getElementById('edit-fund-amount').value);

    const balances = getFundBalances();
    const currentDisplayFund = balances.find(f => f.name.toLowerCase() === name.toLowerCase());
    const currentDisplayAmount = currentDisplayFund ? currentDisplayFund.amount : 0;

    if (targetAmount === currentDisplayAmount) {
        closeModal('modal-edit-fund-balance');
        return;
    }

    const difference = targetAmount - currentDisplayAmount;

    const existing = allData.find(r => r.type === 'fund' && r.fund_name.toLowerCase() === name.toLowerCase());
    
    let record;
    if (existing) {
        record = {
            ...existing,
            fund_amount: (existing.fund_amount || 0) + difference
        };
    } else {
        record = {
            type: 'fund',
            fund_name: name,
            fund_amount: difference,
            borrower_name: '', borrower_id: '', loan_id: '', principal: 0,
            interest_rate: 0, daily_payment: 0, start_date: '', first_payment_date: '',
            end_date: '', status: '', is_renewal: false, previous_loan_id: '',
            old_debt_deducted: 0, source_allocations: '', payments_json: '',
            total_paid: 0, total_interest_earned: 0, completed_date: '', notes: ''
        };
    }

    const result = await (existing ? window.dataSdk.update(record) : window.dataSdk.create(record));
    if (result.isOk) {
        closeModal('modal-edit-fund-balance');
        showToast('Đã cập nhật số dư thực tế!');
    } else {
        showToast('Lỗi khi cập nhật số dư');
    }
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
    amtInput.value = new Intl.NumberFormat('en-US').format(Math.max(0, remainingForDay));
    document.getElementById('payment-info').textContent = `Góp ngày: ${dateStr.split('-').reverse().join('/')} | Đã góp trong ngày: ${fmt(dayTotal)}`;
    
    const btnDelete = document.getElementById('btn-delete-payment');
    if (btnDelete) {
        if (dayTotal > 0) {
            btnDelete.classList.remove('hidden');
        } else {
            btnDelete.classList.add('hidden');
        }
    }
    
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
    
    // Cập nhật Optimistic UI (nhanh 1 cái bụp)
    const idx = allData.findIndex(r => r.loan_id === updatedLoan.loan_id);
    if (idx !== -1) allData[idx] = updatedLoan;
    currentLoan = updatedLoan;
    
    closeModal('modal-payment');
    showLoanDetail(updatedLoan.loan_id);
    showToast('Đã ghi nhận!');

    // Gửi request ngầm
    window.dataSdk.update(updatedLoan).then(result => {
        if (!result.isOk) { 
            showToast('Lỗi mạng! Đang đồng bộ lại...');
            // Có thể thêm logic rollback ở đây, nhưng reload là cách an toàn nhất
            setTimeout(() => window.location.reload(), 1500);
        }
    });
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
    renderTransactionHistory();
}

function renderTransactionHistory() {
    const container = document.getElementById('transaction-history-list');
    if (!container) return;
    if (!currentLoan) { container.innerHTML = ''; return; }

    const payments = getPayments(currentLoan.loan_id);
    let historyHtml = '';
    
    const start = new Date(currentLoan.first_payment_date);
    const todayObj = new Date(today());
    let endDateToCheck = new Date(currentLoan.end_date);
    if (currentLoan.status === 'completed' && currentLoan.completed_date) {
        endDateToCheck = new Date(currentLoan.completed_date);
    } else if (todayObj < endDateToCheck) {
        endDateToCheck = todayObj;
    }

    let paidDays = 0;
    let debtDays = 0;
    
    for (let d = new Date(start); d <= endDateToCheck; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const dayPayments = payments.filter(p => p.date === dateStr);
        const dayTotal = dayPayments.reduce((s, p) => s + p.amount, 0);
        if (dayTotal >= currentLoan.daily_payment) paidDays++;
        else debtDays++;
    }

    historyHtml += `<div class="p-3 bg-gray-50 rounded-lg mb-2">
        <p class="text-gray-700 font-medium mb-1">Tổng kết quá trình:</p>
        <ul class="list-disc pl-4 text-gray-600">
            <li>Đã xác nhận đóng: <span class="font-bold text-green-600">${paidDays} ngày</span></li>
            <li>Nợ lại: <span class="font-bold text-red-500">${debtDays} ngày</span></li>
        </ul>
    </div>`;

    const renewalLoan = allData.find(r => r.previous_loan_id === currentLoan.loan_id);
    if (renewalLoan) {
        const debtDeducted = renewalLoan.old_debt_deducted || 0;
        const dedDays = currentLoan.daily_payment > 0 ? Math.round(debtDeducted / currentLoan.daily_payment) : 0;
        historyHtml += `<div class="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p class="text-blue-800 font-medium">Đã tất toán bằng cách vay vòng mới!</p>
            <p class="text-blue-600 mt-1">Ngày lên hồ sơ mới: <strong>${renewalLoan.start_date.split('-').reverse().join('/')}</strong></p>
            <p class="text-blue-600">Số tiền khấu trừ: <strong>${fmt(debtDeducted)}</strong> (Tương đương nợ <strong>${dedDays} ngày</strong>)</p>
            <button onclick="showLoanDetail('${renewalLoan.loan_id}')" class="mt-2 text-xs bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-blue-700">Xem vòng mới này</button>
        </div>`;
    }

    container.innerHTML = historyHtml;
}

window.confirmDeleteLoan = function() {
    if (!currentLoan) return;
    if (!confirm('Bạn có chắc chắn muốn xóa hoàn toàn khoản vay này không?\nHành động này không thể hoàn tác!')) return;
    
    allData = allData.filter(r => r.loan_id !== currentLoan.loan_id);
    
    window.dataSdk.remove(currentLoan.loan_id).then(result => {
        if (!result.isOk) {
            showToast('Lỗi mạng, không thể xóa!');
            setTimeout(() => window.location.reload(), 1500);
        }
    });
    
    goBack();
    renderDashboard();
    renderLoans();
    renderFunds();
    renderStats();
    showToast('Đã xóa khoản vay!');
};

window.handleDeletePayment = function() {
    const targetDate = document.getElementById('payment-date').value;
    if (!currentLoan || !targetDate) return;
    
    if (!confirm(`Bạn có chắc chắn muốn xóa/hoàn tác tất cả giao dịch trong ngày ${targetDate.split('-').reverse().join('/')}?`)) return;
    
    const payments = getPayments(currentLoan.loan_id).filter(p => p.date !== targetDate);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const totalRequired = currentLoan.principal * (1 + currentLoan.interest_rate / 100);
    const updatedLoan = { ...currentLoan, payments_json: JSON.stringify(payments), total_paid: totalPaid };
    
    if (totalPaid < totalRequired) {
        updatedLoan.status = 'active';
        updatedLoan.completed_date = null;
    }
    
    const idx = allData.findIndex(r => r.loan_id === updatedLoan.loan_id);
    if (idx !== -1) allData[idx] = updatedLoan;
    currentLoan = updatedLoan;
    
    closeModal('modal-payment');
    showLoanDetail(updatedLoan.loan_id);
    showToast('Đã xóa giao dịch!');

    window.dataSdk.update(updatedLoan).then(result => {
        if (!result.isOk) { 
            showToast('Lỗi mạng! Đang đồng bộ lại...');
            setTimeout(() => window.location.reload(), 1500);
        }
    });
};

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
        else if (dateStr === todayDate) cls = 'payment-today';

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
        const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const dayOfWeekStr = daysOfWeek[d.getDay()];
        cell.innerHTML = `<span>${dayMonth}</span><div class="lunar-date">${lunarStr}</div><div class="lunar-date">${dayOfWeekStr}</div><div class="payment-subtext flex items-center justify-center opacity-80 mt-1">${subContent}</div>`;
        cell.title = `${dateStr}: ${fmt(dayTotal)}`;
        cell.onclick = () => openPaymentModal(dateStr, dayTotal);
        grid.appendChild(cell);
    }
    lucide.createIcons();
}

// Renders
function renderDashboard() {
    const loans = getLoans().filter(l => l.status === 'active');
    const totalLending = loans.reduce((s, l) => s + (l.principal || 0), 0);
    const totalDebt = loans.reduce((s, l) => s + ((l.principal * (1 + l.interest_rate / 100)) - (l.total_paid || 0)), 0);
    
    const allLoans = getLoans();
    const alltimeLending = allLoans.reduce((s, l) => s + (l.principal || 0), 0);
    const alltimeCollected = allLoans.reduce((s, l) => s + (l.total_paid || 0), 0);
    
    const fundBalances = getFundBalances();
    const quyChung = fundBalances.find(f => f.name.toLowerCase() === 'quỹ chung');
    const fundBalance = quyChung ? quyChung.amount : 0;
    const externalDebt = fundBalances.filter(f => f.name.toLowerCase() !== 'quỹ chung' && f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0);

    document.getElementById('val-total-lending').textContent = fmt(totalLending);
    document.getElementById('val-total-debt').textContent = fmt(Math.max(0, totalDebt));
    document.getElementById('val-fund-balance').textContent = fmt(fundBalance);
    document.getElementById('val-external-debt').textContent = fmt(externalDebt);
    
    const elAllLending = document.getElementById('val-total-alltime-lending');
    if (elAllLending) elAllLending.textContent = fmt(alltimeLending);
    const elAllCollected = document.getElementById('val-total-alltime-collected');
    if (elAllCollected) elAllCollected.textContent = fmt(alltimeCollected);

    let expectedToday = 0;
    let collectedToday = 0;
    let pendingListHtml = '';
    const tDate = today();

    loans.forEach(l => {
        const start = new Date(l.first_payment_date);
        const end = new Date(l.end_date);
        const tObj = new Date(tDate);
        if (tObj >= start && tObj <= end) {
            const payments = JSON.parse(l.payments_json || '[]');
            const dayPayments = payments.filter(p => (p.time && p.time.startsWith(tDate)) || (!p.time && p.date === tDate));
            const dayTotal = dayPayments.reduce((s, p) => s + p.amount, 0);
            collectedToday += dayTotal;

            const daysPassed = Math.floor((tObj - start) / (1000 * 60 * 60 * 24)) + 1;
            const expectedTotalUntilToday = daysPassed * l.daily_payment;
            const currentDebt = Math.max(0, expectedTotalUntilToday - (l.total_paid || 0));

            expectedToday += currentDebt + dayTotal;

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
                        <p class="text-[12px] font-medium text-gray-600 mt-0.5">Tổng vay: ${fmt(l.principal)}</p>
                        <div class="flex flex-row flex-wrap items-center gap-1.5 mt-1.5">
                            <span class="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-mono truncate" title="Mã KH">${l.borrower_id}</span>
                            <span class="bg-blue-50 text-blue-500 text-[10px] px-1.5 py-0.5 rounded font-mono truncate" title="Mã vay">${l.loan_id}</span>
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
    list.innerHTML = loans.map(l => {
        const totalRequired = l.principal * (1 + l.interest_rate / 100);
        const pct = Math.min(100, Math.round(((l.total_paid || 0) / totalRequired) * 100));
        
        const totalDays = l.daily_payment > 0 ? Math.round(totalRequired / l.daily_payment) : 0;
        const completedDays = l.daily_payment > 0 ? Math.floor((l.total_paid || 0) / l.daily_payment) : 0;
        const start = new Date(l.first_payment_date);
        const tObj = new Date(today());
        const daysPassed = Math.max(0, Math.floor((tObj - start) / (1000 * 60 * 60 * 24)) + 1);
        const expectedTotalUntilToday = daysPassed * l.daily_payment;
        const currentDebt = Math.max(0, expectedTotalUntilToday - (l.total_paid || 0));
        const debtDays = l.daily_payment > 0 ? Math.floor(currentDebt / l.daily_payment) : 0;

        let progressText = `${completedDays}/${totalDays} ngày`;
        if (debtDays > 0) progressText += ` <span class="text-red-500 font-medium">(Nợ: ${debtDays} ngày)</span>`;

        return `<div class="borrower-card" onclick="showLoanDetail('${l.loan_id}')">
    <div class="flex-1 w-full">
        <div class="flex justify-between items-start w-full">
            <div>
                <p class="font-semibold text-sm">${l.borrower_name}</p>
                <div class="flex flex-row flex-wrap items-center gap-1.5 mt-1.5">
                    <span class="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-mono truncate" title="Mã KH">${l.borrower_id}</span>
                    <span class="bg-blue-50 text-blue-500 text-[10px] px-1.5 py-0.5 rounded font-mono truncate" title="Mã vay">${l.loan_id}</span>
                </div>
            </div>
            <div class="text-right flex flex-col items-end">
                <p class="text-sm font-semibold">${fmt(l.principal)}</p>
                <span class="tag ${l.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'} text-[10px] mt-1">${l.status === 'active' ? 'Đang vay' : 'Hoàn thành'}</span>
            </div>
        </div>
        <div class="mt-3 w-full">
            <div class="flex justify-between text-[10px] text-gray-500 mb-1"><span>Tiến độ: ${progressText}</span><span>${pct}%</span></div>
            <div class="w-full bg-gray-100 rounded-full h-1.5">
                <div class="bg-blue-500 h-1.5 rounded-full" style="width:${pct}%"></div>
            </div>
        </div>
    </div>
</div>`
    }).join('');
}

function filterLoans(f) { loanFilter = f; renderLoans(); }

function getFundBalances() {
    const funds = getFunds();
    const loans = getLoans();
    const balances = {};
    funds.forEach(f => { balances[f.fund_name.toLowerCase()] = { name: f.fund_name, amount: f.fund_amount || 0 }; });
    if (!balances['quỹ chung']) balances['quỹ chung'] = { name: 'Quỹ chung', amount: 0 };

    let totalCollected = 0;
    let totalOldDebtDeducted = 0;
    loans.forEach(l => {
        totalCollected += (l.total_paid || 0);
        totalOldDebtDeducted += (l.old_debt_deducted || 0);
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

    balances['quỹ chung'].amount += (totalCollected - totalOldDebtDeducted);
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
            actionBtn = `
                <div class="flex gap-2 mt-1">
                    <button onclick="openPayDebtModal('${f.name}', ${Math.abs(f.amount)})" class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Trả nợ</button>
                    <button onclick="openAddMoneyModal('${f.name}')" class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">+ Thêm tiền</button>
                    <button onclick="openEditFundBalanceModal('${f.name}', ${f.amount})" class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1"><i data-lucide="edit-2" style="width:12px;height:12px"></i> Sửa</button>
                </div>
            `;
        } else {
            actionBtn = `
                <div class="flex gap-2 mt-1">
                    <button onclick="openAddMoneyModal('${f.name}')" class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">+ Thêm tiền</button>
                    <button onclick="openEditFundBalanceModal('${f.name}', ${f.amount})" class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1"><i data-lucide="edit-2" style="width:12px;height:12px"></i> Sửa</button>
                </div>
            `;
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
    const loans = getLoans().filter(l => l.principal !== undefined);
    const totalPrincipal = loans.reduce((s, l) => s + (l.principal || 0), 0);
    const totalExpInterest = loans.reduce((s, l) => s + ((l.principal || 0) * (l.interest_rate || 0) / 100), 0);
    const totalCollected = loans.reduce((s, l) => {
        const interest = Math.max(0, (l.total_paid || 0) - (l.principal || 0));
        return s + interest;
    }, 0);
    document.getElementById('stat-principal').textContent = fmt(totalPrincipal);
    document.getElementById('stat-expected-interest').textContent = fmt(totalExpInterest);
    document.getElementById('stat-collected-interest').textContent = fmt(totalCollected);
    document.getElementById('stat-pending-interest').textContent = fmt(totalExpInterest - totalCollected);

    const active = loans.filter(l => l.status === 'active');
    if (active.length > 0) {
        const top = active.sort((a, b) => {
            const ra = ((a.principal || 0) * (1 + (a.interest_rate || 0) / 100)) - (a.total_paid || 0);
            const rb = ((b.principal || 0) * (1 + (b.interest_rate || 0) / 100)) - (b.total_paid || 0);
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

// Global edge swipe back for detail view
let edgeSwipeStartX = 0;
document.addEventListener('touchstart', (e) => {
    if (document.getElementById('view-detail').classList.contains('active')) {
        edgeSwipeStartX = e.touches[0].clientX;
    }
}, {passive: true});

document.addEventListener('touchend', (e) => {
    if (document.getElementById('view-detail').classList.contains('active')) {
        let diff = e.changedTouches[0].clientX - edgeSwipeStartX;
        if (edgeSwipeStartX < 40 && diff > 70) {
            goBack();
        }
    }
}, {passive: true});

async function quickPayToday(loanId, amount) {
    if (!confirm('Xác nhận đã thu đủ ' + fmt(amount) + '?')) {
        document.querySelectorAll('.swipeable-card').forEach(c => c.style.transform = 'translateX(0px)');
        return;
    }
    const currentLoanLocal = allData.find(r => r.loan_id === loanId);
    if (!currentLoanLocal) return;

    const tDate = today();
    const payments = JSON.parse(currentLoanLocal.payments_json || '[]');
    const start = new Date(currentLoanLocal.first_payment_date);
    const tObj = new Date(tDate);
    
    let remainingAmountToDistribute = amount;
    
    for (let d = new Date(start); d <= tObj && remainingAmountToDistribute > 0; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const dayPayments = payments.filter(p => p.date === dateStr);
        const dayTotal = dayPayments.reduce((s, p) => s + p.amount, 0);
        const missingForDay = currentLoanLocal.daily_payment - dayTotal;
        
        if (missingForDay > 0) {
            const payAmt = Math.min(missingForDay, remainingAmountToDistribute);
            payments.push({ date: dateStr, amount: payAmt, time: new Date().toISOString() });
            remainingAmountToDistribute -= payAmt;
        }
    }

    if (remainingAmountToDistribute > 0) {
        payments.push({ date: tDate, amount: remainingAmountToDistribute, time: new Date().toISOString() });
    }

    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const totalRequired = currentLoanLocal.principal * (1 + currentLoanLocal.interest_rate / 100);
    const updatedLoan = { ...currentLoanLocal, payments_json: JSON.stringify(payments), total_paid: totalPaid };
    if (totalPaid >= totalRequired) {
        updatedLoan.status = 'completed';
        updatedLoan.completed_date = today();
    }
    const result = await window.dataSdk.update(updatedLoan);
    if (result.isOk) {
        showToast('Đã ghi nhận đủ!');
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
window.openAddMoneyModal = openAddMoneyModal;
window.handleAddMoney = handleAddMoney;
window.openEditFundBalanceModal = openEditFundBalanceModal;
window.handleEditFundBalance = handleEditFundBalance;
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
window.showBorrowerSuggestions = showBorrowerSuggestions;
window.hideBorrowerSuggestions = hideBorrowerSuggestions;
window.openEditLoanModal = openEditLoanModal;
window.calculateEditLoanInfo = calculateEditLoanInfo;
window.handleEditLoan = handleEditLoan;

// ==========================================
// KẾT NỐI VÀ KHỞI TẠO DỮ LIỆU (DATABASE SDK)
// ==========================================

function showLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    }
}
function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
    }
}

if (!window.dataSdk) {
    const storageKey = 'loan_data';
    const readLocalStore = () => {
        try {
            const raw = localStorage.getItem(storageKey) || '[]';
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    };
    const writeLocalStore = (data) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Could not write local storage', e);
        }
    };
    const ensureLocalFund = (data) => {
        const list = Array.isArray(data) ? data : [];
        if (!list.some(r => r.type === 'fund' && r.fund_name && r.fund_name.toLowerCase() === 'quỹ chung')) {
            list.push({
                type: 'fund',
                fund_id: 'default-quy-chung',
                fund_name: 'Quỹ chung',
                fund_amount: 0
            });
        }
        return list;
    };

    const getApiUrl = (path) => {
        const port = window.location.port;
        if (port && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            return `http://localhost:3001${path}`;
        }
        return path;
    };

    window.dataSdk = {
        data: [],
        async fetchAll() {
            showLoading();
            try {
                const res = await fetch(getApiUrl('/api/data'));
                if (res.ok) {
                    this.data = ensureLocalFund(await res.json());
                    writeLocalStore(this.data);
                    if (this.handler) this.handler.onDataChanged(this.data);
                    hideLoading();
                    return;
                }
            } catch (e) {
                console.warn('API unavailable, using local storage fallback:', e);
            }

            this.data = ensureLocalFund(readLocalStore());
            writeLocalStore(this.data);
            if (this.handler) this.handler.onDataChanged(this.data);
            showToast('Đang dùng dữ liệu cục bộ vì backend chưa sẵn sàng.');
            hideLoading();
            return;
        },
        async create(record) {
            showLoading();
            try {
                const res = await fetch(getApiUrl('/api/data'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
                if (res.ok) {
                    await this.fetchAll();
                    hideLoading();
                    return { isOk: true };
                }
            } catch (e) {
                console.warn('Create API failed, saving locally:', e);
            }

            this.data = ensureLocalFund(readLocalStore());
            this.data.push(record);
            writeLocalStore(this.data);
            if (this.handler) this.handler.onDataChanged(this.data);
            hideLoading();
            return { isOk: true };
        },
        async update(record) {
            showLoading();
            try {
                const res = await fetch(getApiUrl('/api/data'), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
                if (res.ok) {
                    await this.fetchAll();
                    hideLoading();
                    return { isOk: true };
                }
            } catch (e) {
                console.warn('Update API failed, saving locally:', e);
            }

            this.data = ensureLocalFund(readLocalStore());
            const idx = this.data.findIndex(r => (r.loan_id || r.fund_id || r.borrower_id || r.id) === (record.loan_id || record.fund_id || record.borrower_id || record.id));
            if (idx >= 0) this.data[idx] = record; else this.data.push(record);
            writeLocalStore(this.data);
            if (this.handler) this.handler.onDataChanged(this.data);
            hideLoading();
            return { isOk: true };
        },
        async remove(id) {
            showLoading();
            try {
                const res = await fetch(getApiUrl(`/api/data?id=${id}`), {
                    method: 'DELETE'
                });
                if (res.ok) {
                    await this.fetchAll();
                    hideLoading();
                    return { isOk: true };
                }
            } catch (e) {
                console.warn('Delete API failed, saving locally:', e);
            }

            this.data = ensureLocalFund(readLocalStore());
            this.data = this.data.filter(r => (r.loan_id || r.fund_id || r.borrower_id || r.id) !== id);
            writeLocalStore(this.data);
            if (this.handler) this.handler.onDataChanged(this.data);
            hideLoading();
            return { isOk: true };
        },
        async init(handler) {
            this.handler = handler;
            this.data = ensureLocalFund(readLocalStore());
            writeLocalStore(this.data);
            setTimeout(() => handler.onDataChanged(this.data), 0);
            try {
                await this.fetchAll();
            } catch (e) {
                console.warn('Init fetch failed:', e);
                hideLoading();
            }
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

const ALLOWED_PHONES = ['0966767731', '0335030381'];

window.handleLogin = function() {
    const phone = document.getElementById('login-phone').value.trim();
    if (ALLOWED_PHONES.includes(phone)) {
        localStorage.setItem('auth_phone', phone);
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('flex');
        document.getElementById('login-error').classList.add('hidden');
        initApp();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
};

async function initApp() {
    const result = await window.dataSdk.init(dataHandler);
    if (!result.isOk) showToast('L?i k?t n?i d? li?u');
    lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
    const phone = localStorage.getItem('auth_phone');
    if (ALLOWED_PHONES.includes(phone)) {
        document.getElementById('login-screen').classList.add('hidden');
        initApp();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-screen').classList.add('flex');
    }
});

