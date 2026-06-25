const fs = require('fs');

const map = {
    '??A ?`t gi?>i h?n d?_ li?u': 'Đã đạt giới hạn dữ liệu',
    'khA\'ng ?`?  ?`? xu?t': 'không đủ để xuất',
    'Vui lAng gim s?` ti?n hoc thAm ngu?"n ngoi': 'Vui lòng giảm số tiền hoặc thêm nguồn ngoài',
    'dT? ng ngu?"n ti?n phi bng': '`Tổng nguồn tiền phải bằng',
    '??A tr? n? cc': 'Đã trừ nợ cũ',
    'T?o kho?n vay thAnh cA\'ng!': 'Tạo khoản vay thành công!',
    '??A ?`t gi?>i h?n': 'Đã đạt giới hạn',
    '??A thAm ngu?"n v?`n': 'Đã thêm nguồn vốn',
    'S?` ti?n tr khA\'ng ?`?c l?>n hn s?` n?!': 'Số tiền trả không được lớn hơn số nợ!',
    'Qu? chung khA\'ng ?`?  ti?n!': 'Quỹ chung không đủ tiền!',
    '??A tr n? thAnh cA\'ng!': 'Đã trả nợ thành công!',
    'dGp ngy:': '`Góp ngày:',
    '??A gA3p trong ngAy:': 'Đã góp trong ngày:',
    '??A ghi nh-n!': 'Đã ghi nhận!',
    'Ma KH:': 'Mã KH:',
    'Ma vay:': 'Mã vay:',
    'dAm l?<ch:': '`Âm lịch:',
    '?`a hon thnhd': 'đã hoàn thành`',
    'GA3p ?`? ': 'Góp đủ',
    '??A thu ?`?  ht hA\'m nay! dYZ%': 'Đã thu đủ hết hôm nay! 🎉',
    'KhA\'ng cA3 l?<ch thu hm nay': 'Không có lịch thu hôm nay',
    'Cha cA3 ngu?"n v?`n no': 'Chưa có nguồn vốn nào',
    'Qun LA Cho Vay GA3p': 'Quản Lý Cho Vay Góp',
    'N ngoAi': 'Nợ ngoài',
    'Hot `Tng hA\'m nay': 'Hoạt động hôm nay',
    '?A thu / C n thu': 'Đã thu / Cần thu',
    'Ch? thu hA\'m nay': 'Chờ thu hôm nay',
    '?A thu `  ht hA\'m nay! dYZ%': 'Đã thu đủ hết hôm nay! 🎉',
    'HoAn\\n                thAnh': 'Hoàn\n                thành',
    'Cha cA3 khon vay': 'Chưa có khoản vay',
    'HA\'m nay': 'Hôm nay',
    'ThAng nAy': 'Tháng này',
    'Nm nay': 'Năm nay',
    'T ng lAi d kin': 'Tổng lãi dự kiến',
    'LAi `A thu': 'Lãi đã thu',
    'LAi cha thu': 'Lãi chưa thu',
    'KhAch n nhi?u nht': 'Khách nợ nhiều nhất',
    'LAi sut': 'Lãi suất',
    'GA3p/ngAy': 'Góp/ngày',
    'NgAy b_t ` u': 'Ngày bắt đầu',
    '?A gA3p': 'Đã góp',
    'CAn n': 'Còn nợ',
    'L<ch gA3p': 'Lịch góp',
    'Th`ng kA': 'Thống kê',
    'TAn ng?i\\n                    vay': 'Tên người\n                    vay',
    'NgAy giao\\n                    ti?n': 'Ngày giao\n                    tiền',
    'NgAy b_t \\n` u\\n                            gA3p': 'Ngày bắt \nđầu\n                            góp',
    'S` ngAy gA3p': 'Số ngày góp',
    'S` ngAy\\n                            lAi': 'Số ngày\n                            lãi',
    'gA3p/ngAy': 'góp/ngày',
    'NgAy kt\\n                            thAc': 'Ngày kết\n                            thúc',
    'TAn ngu"n': 'Tên nguồn',
    'ThAm ngu"n v`n': 'Thêm nguồn vốn',
    'Ghi nh-n thanh toAn': 'Ghi nhận thanh toán',
    'Tr n ngu"n ngoAi': 'Trả nợ nguồn ngoài',
    'XAc nh-n tr n': 'Xác nhận trả nợ',
    'NgAy b_t ` u': 'Ngày bắt đầu',
    'dQu? chung ch?% cn': '`Quỹ chung chỉ còn'
};

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [bad, good] of Object.entries(map)) {
        content = content.split(bad).join(good);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
}

fixFile('canva.html');
fixFile('js/app.js');
