const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
try { new Function(code); console.log('game.js OK (' + code.split('\n').length + ' lines)'); }
catch(e) { console.log('FAIL game.js: ' + e.message); process.exit(1); }
const code2 = fs.readFileSync('data.js', 'utf8');
try { new Function(code2); console.log('data.js OK (' + code2.split('\n').length + ' lines)'); }
catch(e) { console.log('FAIL data.js: ' + e.message); process.exit(1); }
