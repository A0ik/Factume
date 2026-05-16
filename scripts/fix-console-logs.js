const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/(app)/ocr/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remplacer tous les console.log par debugLog (en gardant les arguments)
content = content.replace(/console\.log\(`\[OCR DEBUG\] (.*?)`, (.*?)\);/g, 'debugLog(`$1`, $2);');

// Remplacer tous les console.warn par debugWarn
content = content.replace(/console\.warn\(`\[OCR DEBUG\] (.*?)`, (.*?)\);/g, 'debugWarn(`$1`, $2);');

// Remplacer tous les console.error par debugError
content = content.replace(/console\.error\(`\[OCR DEBUG\] (.*?)`, (.*?)\);/g, 'debugError(`$1`, $2);');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Console.logs remplacés par des fonctions de logging conditionnel');
