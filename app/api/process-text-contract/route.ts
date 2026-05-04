import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const { text, contract_type } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });
    }

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY
    });

    // System prompts for different contract types
    const systemPrompts: Record<string, string> = {
      cdd: `Tu es un assistant expert en contrats de travail français, spécialisé dans les CDD (Contrats à Durée Déterminée).

INSTRUCTIONS PRÉCISES D'EXTRACTION POUR UN CDD :

1. IDENTIFICATION DU SALARIÉ :
   - Prénom et nom : cherche en priorité l'en-tête "Salarié", "Employé", "Collaborateur"
   - Adresse complète : numéro, rue, code postal, ville
   - Nationalité : Française, Marocaine, Algérienne, etc.
   - Date de naissance : format JJ/MM/AAAA ou en toutes lettres → YYYY-MM-DD
   - NIR/Sécu : 15 chiffres, retire tous les espaces et tirets

2. DATES ET DURÉE DU CONTRAT :
   - Date début : "date de début", "début du contrat", "à compter du", "prend effet"
   - Date fin : "date de fin", "fin du contrat", "jusqu'au", "durée de"
   - Durée totale : peut être exprimée en semaines ou mois
   - Période d'essai : "période d'essai", "essai", durée en jours

3. MOTIF DU RECOURS AU CDD (OBLIGATOIRE) :
   - Remplacement : "remplacement de", "remplace", "titulaire"
   - Accroisse d'activité : "accroisse", "augmentation temporaire d'activité"
   - Saisonnier : "saison", "saisonnier", "activité saisonnière"
   - Usage : "contrat d'usage", "secteur d'usage", "convention"
   - Nom du salarié remplacé : si motif = remplacement

4. RÉMUNÉRATION :
   - Montant du salaire : extraire le nombre uniquement
   - Taux horaire : peut inclure des primes ou commissions
   - Fréquence : mensuel (mois), horaire (heure)
   - Peut inclure : primes, avantages en nature, congés payés

5. POSTE ET CONDITIONS DE TRAVAIL :
   - Intitulé du poste : "fonction", "poste", "emploi occupé"
   - Lieu de travail : adresse, télétravail possible
   - Horaires : durée hebdomadaire, heures par jour

6. EMPLOYEUR / ENTREPRISE :
   - Dénomination sociale : nom légal de l'entreprise
   - Adresse complète du siège
   - SIRET : 14 chiffres
   - Nom de l'employeur : personne signataire

Format JSON attendu (null si non trouvé) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeAddress": "string ou null",
  "employeePostalCode": "string ou null",
  "employeeCity": "string ou null",
  "employeeBirthDate": "string ou null (YYYY-MM-DD)",
  "employeeSocialSecurity": "string ou null (15 chiffres, sans espaces ni tirets)",
  "employeeNationality": "string ou null",
  "contractStartDate": "string ou null (YYYY-MM-DD)",
  "contractEndDate": "string ou null (YYYY-MM-DD)",
  "trialPeriodDays": "string ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "workSchedule": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "contractReason": "remplacement, accroisse, saisonnier, ou usage",
  "replacedEmployeeName": "string ou null",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companyPostalCode": "string ou null",
  "companyCity": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "employerTitle": "string ou null"
}`,

      cdi: `Tu es un assistant expert en contrats de travail français, spécialisé dans les CDI (Contrats à Durée Indéterminée).

INSTRUCTIONS PRÉCISES D'EXTRACTION POUR UN CDI :

1. IDENTIFICATION DU SALARIÉ :
   - Prénom et nom : cherche "Salarié", "Employé", "Collaborateur", "Mr", "Mme"
   - Adresse : numéro, rue, code postal, ville
   - Nationalité : Française, Marocaine, Algérienne, Tunisienne, etc.
   - Date de naissance : JJ/MM/AAAA ou en toutes lettres → YYYY-MM-DD
   - NIR/Sécu : 15 chiffres, retire espaces et tirets
   - Qualification : métier, qualification professionnelle

2. DATES ET PÉRIODE D'ESSAI :
   - Date de début : "date de début", "début du contrat", "prise de fonction", "à compter du"
   - Période d'essai : durée en jours ou mois, peut être renouvelable
   - Format : "2 mois", "90 jours", "1 mois renouvelable 1 fois"

3. EMPLOI ET CLASSIFICATION :
   - Intitulé du poste : "fonction", "poste", "emploi", "titre"
   - Classification : niveau, coefficient, catégorie professionnelle
   - Convention collective : IDCC, nom de la convention, applicable
   - Horaires : durée hebdomadaire, 35h, 39h, temps partiel

4. RÉMUNÉRATION :
   - Montant : extraire le nombre uniquement (sans €, ni espaces)
   - Taux horaire ou mensuel
   - Peut inclure : primes, avantages, 13ème mois, participation

5. CLAUSES PARTICULIÈRES :
   - Clause d'essai : présence de période d'essai
   - Clause de non-concurrence : "non-concurrence"
   - Clause de mobilité : "mobilité géographique", "mutation"

6. EMPLOYEUR :
   - Raison sociale : nom légal de l'entreprise
   - Adresse du siège social
   - SIRET : 14 chiffres
   - Représentant légal : gérant, directeur, signataire

Format JSON attendu (null si non trouvé) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeAddress": "string ou null",
  "employeePostalCode": "string ou null",
  "employeeCity": "string ou null",
  "employeeBirthDate": "string ou null (YYYY-MM-DD)",
  "employeeSocialSecurity": "string ou null (15 chiffres, sans espaces ni tirets)",
  "employeeNationality": "string ou null",
  "employeeQualification": "string ou null",
  "contractStartDate": "string ou null (YYYY-MM-DD)",
  "trialPeriodDays": "string ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "workSchedule": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "contractClassification": "string ou null",
  "workingHours": "string ou null",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companyPostalCode": "string ou null",
  "companyCity": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "employerTitle": "string ou null",
  "collectiveAgreement": "string ou null",
  "probationClause": "boolean ou null",
  "nonCompeteClause": "boolean ou null",
  "mobilityClause": "boolean ou null"
}`,

      other: `Tu es un assistant expert en contrats de travail français, spécialisé dans les autres types de contrats (stage, freelance, intérim, alternance, etc.).

INSTRUCTIONS PRÉCISES D'EXTRACTION :

1. TYPE DE CONTRAT :
   - stage : "convention de stage", "stage de", "période de stage"
   - freelance : "prestation de service", "consultant", "freelance"
   - temp_work : "intérim", "mission", "entreprise utilisatrice"
   - apprenticeship : "contrat d'apprentissage", "apprenti"
   - professionalization : "professionnalisation", "alternance"
   - other : si aucun type identifié

2. PARTIES AU CONTRAT :
   - Salarié/Stagiaire : prénom, nom, adresse, email, téléphone
   - Entreprise/Tuteur : nom, adresse, SIRET, représentant

3. DATES ET DURÉE :
   - Date de début : "date de début", "début", "à compter du"
   - Date de fin : "date de fin", "fin", "jusqu'au"
   - Durée : en semaines ou mois

4. RÉMUNÉRATION :
   - Montant : extraire le nombre uniquement
   - Fréquence : mensuel, horaire, hebdomadaire, forfait
   - Gratification (stage) : montant mensuel

5. SPÉCIFICITÉS SELON LE TYPE :
   - Stage : tuteur, école, objectifs, tâches
   - Alternance : specialité, formation, objectifs pédagogiques
   - Intérim : mission, entreprise utilisatrice
   - Freelance : prestation, livrables

Format JSON attendu (null si non trouvé) :
{
  "contractCategory": "stage, freelance, temp_work, apprenticeship, professionalization, ou other",
  "contractTitle": "string ou null",
  "durationWeeks": "string ou null",
  "startDate": "string ou null (YYYY-MM-DD)",
  "endDate": "string ou null (YYYY-MM-DD)",
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeAddress": "string ou null",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly, hourly, weekly, ou flat_rate",
  "tutorName": "string ou null",
  "schoolName": "string ou null",
  "speciality": "string ou null",
  "objectives": "string ou null",
  "tasks": "string ou null"
}`
    };

    const systemPrompt = systemPrompts[contract_type] || systemPrompts.other;

    const completion = await openrouter.chat.completions.create({
      // Modèle performant et économique sur OpenRouter : Gemma 3 27B
      // Coût: ~0.10€/M tokens vs ~0.30€/M pour Mistral Small
      // Performance: Excellente pour le français et l'extraction structurée de données
      // Alternative: meta-llama/llama-3.3-70b-instruct pour plus de précision si nécessaire
      model: 'google/gemma-3-27b-it',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0, // Température basse pour une extraction plus précise
      max_tokens: 2000, // Augmenté pour les contrats plus longs
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[process-text-contract] Failed to parse AI response:', err);
      parsed = {};
    }

    return NextResponse.json({ parsed });

  } catch (error: any) {
    console.error('[Process Text Contract] Error:', error);
    const message = error.message || 'Erreur lors du traitement du texte';

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
