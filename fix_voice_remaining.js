const fs = require('fs');

const files = [
  { path: 'app/(app)/documents/commandes/new/page.tsx', mode: 'order' },
  { path: 'app/(app)/documents/livraisons/new/page.tsx', mode: 'delivery' },
  { path: 'app/(app)/documents/acomptes/new/page.tsx', mode: 'deposit' }
];

files.forEach(({ path, mode }) => {
  const content = fs.readFileSync(path, 'utf8');

  // Supprimer les variables voice recording
  const step1 = content.replace(
    /\/\/ Voice recording[\s\S]*?const pendingIdRef = useRef<string \| null>\(null\);/,
    ''
  );

  // Remplacer par le pendingIdRef simple
  const step2 = step1.replace(
    /\/\/ AI generation[\s\S]*?const \[aiPrompt, setAiPrompt\] = useState/,
    `// AI generation\n  const [aiPrompt, setAiPrompt] = useState`
  );

  // Ajouter pendingIdRef après aiError
  const step3 = step2.replace(
    /const \[aiError, setAiError\] = useState\(''\);/,
    `const [aiError, setAiError] = useState('');\n  const pendingIdRef = useRef<string | null>(null);`
  );

  // Trouver et remplacer les fonctions voice par handleVoiceResult
  const voiceFuncPattern = /  const startRecording = async \(\) => \{[\s\S]*?const updateItem =/;

  const handleVoiceResult = `  // Voice result handler
  const handleVoiceResult = (result: VoiceAnalysisResult) => {
    if (result.client_name) {
      const searchTerm = result.client_name.toLowerCase();
      let matchingClient = clients.find(c => c.name.toLowerCase() === searchTerm);
      if (!matchingClient) {
        matchingClient = clients.find(c =>
          c.name.toLowerCase().includes(searchTerm) ||
          searchTerm.includes(c.name.toLowerCase())
        );
      }
      if (matchingClient) {
        setClientId(matchingClient.id);
        setClientName(matchingClient.name);
        toast.success(\`Client "\${matchingClient.name}" sélectionné automatiquement\`);
      } else {
        setClientName(result.client_name);
        setClientId(null);
      }
    }

    if (!clientId) {
      if (result.client_email) setClientEmail(result.client_email);
      if (result.client_phone) setClientPhone(result.client_phone);
      if (result.client_address) setClientAddress(result.client_address);
      if (result.client_city) setClientCity(result.client_city);
      if (result.client_postal_code) setClientPostalCode(result.client_postal_code);
      if (result.client_siret) setClientSiret(result.client_siret);
      if (result.client_vat_number) setClientVatNumber(result.client_vat_number);
    }

    if (result.items?.length) {
      setItems(result.items.map((item) => ({
        id: generateId(),
        description: item.description || '',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        vat_rate: Number(item.vat_rate) || 20,
      })));
    }
    if (result.notes) setNotes(result.notes);
    if (result.due_days != null) {
      setPaymentDays(result.due_days);
      const days = result.due_days;
      const termMap: Record<number, string> = { 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' };
      setPaymentTermId(termMap[days] || \`custom-\${days}\`);
    }
    if (result.discount_percent) {
      setDiscountPercent(result.discount_percent);
    }
  };

  const updateItem =`;

  const step4 = step3.replace(voiceFuncPattern, handleVoiceResult);

  // Remplacer l'UI voice par PulseVoiceRecorder
  const voiceUIPattern = /<div className="flex flex-col items-center gap-4">[\s\S]*?<\/AnimatePresence>/;

  const voiceUIReplacement = `<PulseVoiceRecorder
              onResult={handleVoiceResult}
              isPro={sub.canUseVoice}
              mode="${mode}"
              existingItems={items}
              sector={profile?.sector || ''}
              onClose={() => setMode('manual')}
            />
          </motion.div>
        )}
      </AnimatePresence>`;

  const step5 = step4.replace(voiceUIPattern, voiceUIReplacement);

  fs.writeFileSync(path, step5, 'utf8');
  console.log(`Modifié ${path} (mode: ${mode})`);
});
