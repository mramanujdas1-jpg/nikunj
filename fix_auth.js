const fs = require('fs');
let html = fs.readFileSync('./public/index.html', 'utf8');

html = html.replace('await activeSession.getToken({skipCache:true});', 'await activeSession.getToken();');
html = html.replace('await session.getToken({skipCache:true});', 'await session.getToken();');

fs.writeFileSync('./public/index.html', html, 'utf8');
console.log('Fixed index.html');
