const fs = require('fs');
const filePath = process.argv[2];

// Déterminer le mode
let mode;
if (filePath.includes('avoirs')) {
  mode = 'credit_note';
} else if (filePath.includes('commandes')) {
  mode = 'order';
} else if (filePath.includes('livraisons')) {
  mode = 'delivery';
} else if (filePath.includes('acomptes')) {
  mode = 'deposit';
} else {
  mode = 'invoice';
}

const content = fs.readFileSync(filePath, 'utf8');

// Trouver et remplacer la section voice UI
const pattern = /<div className="flex flex-col items-center gap-4">[\s\S]*?<\/AnimatePresence>/;

const replacement = `<PulseVoiceRecorder
              onResult={handleVoiceResult}
              isPro={sub.canUseVoice}
              mode="${mode}"
              existingItems={items}
              sector={profile?.sector || ''}
              onClose={() => setMode('manual')}
            />`;

const newContent = content.replace(pattern, replacement);

fs.writeFileSync(filePath, newContent, 'utf8');

console.log(`Modifié ${filePath}`);
