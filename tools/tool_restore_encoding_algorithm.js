const fs = require('fs');

function restoreMojibake(filePath) {
    try {
        // Read the file as utf8
        const content = fs.readFileSync(filePath, 'utf8');
        // Convert back to bytes using latin1 (which maps 1:1 to the ANSI characters that were read)
        const buffer = Buffer.from(content, 'latin1');
        // Decode the bytes as UTF-8
        const restored = buffer.toString('utf8');
        
        fs.writeFileSync(filePath, restored, 'utf8');
        console.log('Restored', filePath);
    } catch (e) {
        console.error('Error on', filePath, e);
    }
}

restoreMojibake('canva.html');
restoreMojibake('js/app.js');
