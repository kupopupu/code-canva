export const fmt = n => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = () => new Date().toISOString().slice(0, 10);

export function getNumericValue(str) {
    if (!str) return 0;
    return Number(str.toString().replace(/[^\d-]/g, '')) || 0;
}

export function formatCurrencyInput(input) {
    let val = input.value.replace(/\D/g, '');
    if (val === '') { input.value = ''; return; }
    input.value = new Intl.NumberFormat('en-US').format(val);
}
