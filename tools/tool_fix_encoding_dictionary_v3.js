const fs = require('fs');
const map = {
    '??ang vay': 'Đang vay',
    'Hon thnh': 'Hoàn thành',
    'qu?1 chung': 'quỹ chung',
    'Qu? chung': 'Quỹ chung',
    'Tr n?': 'Trả nợ',
    'Cha \\ncA3 ngu?"n v?`n no': 'Chưa có nguồn vốn nào',
    'L?-i kt n?`i d?_ li?u': 'Lỗi kết nối dữ liệu',
    'Cha \\ncA3': 'Chưa có'
};

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [bad, good] of Object.entries(map)) {
        content = content.split(bad).join(good);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
}

fixFile('js/app.js');
