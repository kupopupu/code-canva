const fs = require('fs');

let js = fs.readFileSync('js/app.js', 'utf8');
let html = fs.readFileSync('canva.html', 'utf8');

// The format string in app.js
js = js.replace(/format\(n \|\| 0\) \+ '.*?'/, "format(n || 0) + 'đ'");

// The 0đ strings in html
html = html.replace(/>0.*?<\/p>/g, '>0đ</p>');
html = html.replace(/>0.*?<\/span>/g, '>0đ</span>');

// Specific Vietnamese strings that are still corrupted
html = html.replace(/Da thu/g, 'Đã thu');
html = html.replace(/C\?n thu/g, 'Cần thu');
html = html.replace(/Dang vay/g, 'Đang vay');
html = html.replace(/Ch\? thu/g, 'Chờ thu');
html = html.replace(/Ho\?t d\?ng hm nay/g, 'Hoạt động hôm nay');
html = html.replace(/Ho\?t d\?ng hm nay/g, 'Hoạt động hôm nay');
html = html.replace(/Ti\?n d\?/g, 'Tiến độ');

// Look for any 0đ that became 0?
html = html.replace(/0`/g, '0đ');
html = html.replace(/0\xEF\xBF\xBD`/g, '0đ');
html = html.replace(/0\?/g, '0đ');

fs.writeFileSync('js/app.js', js, 'utf8');
fs.writeFileSync('canva.html', html, 'utf8');
console.log('Fixed UI fonts');
