import re
import sys

file_path = sys.argv[1]

# Déterminer le mode
if 'avoirs' in file_path:
    mode = 'credit_note'
elif 'commandes' in file_path:
    mode = 'order'
elif 'livraisons' in file_path:
    mode = 'delivery'
elif 'acomptes' in file_path:
    mode = 'deposit'
else:
    mode = 'invoice'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Trouver et remplacer la section voice UI
# Pattern: de <div className="flex flex-col items-center gap-4"> à </AnimatePresence>
pattern = r'<div className="flex flex-col items-center gap-4">.*?</AnimatePresence>'

replacement = '''<PulseVoiceRecorder
              onResult={handleVoiceResult}
              isPro={sub.canUseVoice}
              mode="''' + mode + '''"
              existingItems={items}
              sector={profile?.sector || ''}
              onClose={() => setMode('manual')}
            />'''

content_new = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content_new)

print(f"Modifié {file_path}")
