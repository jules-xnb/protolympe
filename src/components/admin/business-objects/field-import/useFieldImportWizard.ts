/** jsPDF + jspdf-autotable adds lastAutoTable to the doc instance.
 *  This helper avoids repeating `as unknown as` at every call site. */
interface JsPDFWithAutoTable {
  lastAutoTable: { finalY: number };
}
function getLastAutoTableY(doc: unknown): number {
  return (doc as JsPDFWithAutoTable).lastAutoTable.finalY;
}

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  type Step,
  type ParsedRow,
  type MappedField,
  CSV_FIELD_COLUMNS,
  parseCSV,
  generateSlug,
  parseBoolean,
  validateFieldType,
} from './types';
import { queryKeys } from '@/lib/query-keys';

interface UseFieldImportWizardOptions {
  objectDefinitionId: string;
  objectName?: string;
  existingFieldCount: number;
  existingFieldNames: string[];
  onClose: () => void;
}

export function useFieldImportWizard({
  objectDefinitionId,
  objectName,
  existingFieldCount,
  existingFieldNames,
  onClose,
}: UseFieldImportWizardOptions) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const allFields = useMemo(() => {
    return Object.entries(CSV_FIELD_COLUMNS).map(([id, config]) => ({
      id,
      label: config.label,
      required: config.required,
    }));
  }, []);

  const resetState = useCallback(() => {
    setStep('upload');
    setCsvData([]);
    setCsvHeaders([]);
    setMapping({});
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
  }, []);

  // ── Template download ────────────────────────────────

  const downloadTemplate = useCallback(() => {
    const headers = ['field_name', 'field_type', 'field_description', 'field_required', 'field_readonly', 'field_placeholder'];
    const sampleData = [
      ['Titre', 'text', 'Titre principal', 'oui', 'non', 'Ex: Mon titre'],
      ['Description', 'textarea', 'Description détaillée', 'non', 'non', 'Décrivez ici...'],
      ['Montant', 'decimal', 'Montant en euros', 'oui', 'non', 'Ex: 1500.00'],
      ['Date création', 'date', 'Date de création', 'non', 'oui', ''],
    ];

    const csvContent = [
      headers.join(';'),
      ...sampleData.map(row => row.join(';')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_champs.csv';
    link.click();
  }, []);

  const downloadDocPdf = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    const title = objectName ? `Documentation import — ${objectName}` : 'Documentation import des champs';

    // Title
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 27);
    doc.setTextColor(0);

    // Columns table
    doc.setFontSize(12);
    doc.text('Colonnes du CSV', 14, 38);

    autoTable(doc, {
      startY: 42,
      head: [['Colonne', 'Description', 'Requis']],
      body: [
        ['field_name', 'Nom affiché du champ', 'Oui'],
        ['field_type', 'Type technique du champ (voir liste ci-dessous)', 'Oui'],
        ['field_description', 'Description / commentaire interne', 'Non'],
        ['field_required', 'Champ obligatoire (oui/non/true/false)', 'Non'],
        ['field_readonly', 'Champ en lecture seule (oui/non/true/false)', 'Non'],
        ['field_placeholder', 'Texte indicatif affiché dans le champ vide', 'Non'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    // Field types table
    const finalY = getLastAutoTableY(doc) + 12;
    doc.setFontSize(12);
    doc.text('Types de champs disponibles', 14, finalY);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Type', 'Description']],
      body: [
        ['text', 'Texte court'],
        ['textarea', 'Texte long'],
        ['number', 'Nombre entier'],
        ['decimal', 'Nombre décimal'],
        ['date', 'Date'],
        ['datetime', 'Date et heure'],
        ['time', 'Heure'],
        ['checkbox', 'Case à cocher'],
        ['email', 'Email'],
        ['phone', 'Téléphone'],
        ['url', 'URL'],
        ['document', 'Document'],
        ['user_reference', 'Référence utilisateur'],
        ['eo_reference', 'Référence entité org.'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    // Non-importable types table
    const finalY2 = getLastAutoTableY(doc) + 12;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Types non disponibles à l\'import', 14, finalY2);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Ces types nécessitent une configuration supplémentaire et doivent être créés via le formulaire.', 14, finalY2 + 6);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: finalY2 + 10,
      head: [['Type', 'Description', 'Raison']],
      body: [
        ['select', 'Liste déroulante', 'Référentiel requis'],
        ['multiselect', 'Liste à choix multiples', 'Référentiel requis'],
        ['object_reference', 'Référence objet métier', 'Objet cible requis'],
        ['calculated', 'Champ calculé', 'Formule requise'],
        ['aggregation', 'Référence', 'Champ source et cible requis'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [180, 60, 60] },
      styles: { fontSize: 9, textColor: [120, 120, 120] },
      margin: { left: 14, right: 14 },
    });

    // Notes
    const finalY3 = getLastAutoTableY(doc) + 10;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Notes', 14, finalY3);
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text('Format : CSV avec séparateur ; ou , (détection automatique).', 14, finalY3 + 6);
    doc.text('Les valeurs oui/non et true/false sont acceptées pour les colonnes booléennes.', 14, finalY3 + 12);

    // AI-friendly section
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Référence technique (pour IA / automatisation)', 14, 20);
    doc.setFontSize(8);
    doc.setTextColor(80);

    const aiLines = [
      'Ce document décrit le format d\'import CSV pour les champs d\'un objet métier.',
      '',
      'FORMAT DU FICHIER :',
      '- Fichier CSV, encodage UTF-8',
      '- Séparateur : point-virgule (;) ou virgule (,), détection automatique',
      '- Première ligne = en-têtes de colonnes',
      '',
      'COLONNES :',
      '- field_name (obligatoire) : nom affiché du champ, texte libre',
      '- field_type (obligatoire) : identifiant technique du type, voir liste ci-dessous',
      '- field_description (optionnel) : description interne du champ',
      '- field_required (optionnel) : "oui", "non", "true" ou "false" — défaut : non',
      '- field_readonly (optionnel) : "oui", "non", "true" ou "false" — défaut : non',
      '- field_placeholder (optionnel) : texte indicatif affiché dans le champ vide',
      '',
      'TYPES ACCEPTÉS À L\'IMPORT :',
      'text, textarea, number, decimal, date, datetime, time, checkbox,',
      'file, image, email, phone, url, document, user_reference, eo_reference',
      '',
      'TYPES REFUSÉS À L\'IMPORT (à créer manuellement via le formulaire) :',
      '- select : nécessite la sélection d\'un référentiel',
      '- multiselect : nécessite la sélection d\'un référentiel',
      '- object_reference : nécessite la sélection d\'un objet métier cible',
      '- calculated : nécessite la saisie d\'une formule de calcul',
      '- aggregation : nécessite la sélection d\'un champ source (référence) et d\'un champ cible',
      '',
      'RÈGLES DE VALIDATION :',
      '- Un champ portant le même nom qu\'un champ existant dans l\'objet sera rejeté',
      '- Un type non reconnu sera rejeté avec un message d\'erreur',
      '- Les doublons de noms dans le même fichier CSV sont rejetés',
      '- Le slug (identifiant technique) est généré automatiquement depuis le nom',
      '',
      'EXEMPLE DE CSV :',
      'field_name;field_type;field_description;field_required;field_readonly;field_placeholder',
      'Titre;text;Titre principal;oui;non;Ex: Mon titre',
      'Description;textarea;Description détaillée;non;non;Décrivez ici...',
      'Montant;decimal;Montant en euros;oui;non;Ex: 1500.00',
      'Date création;date;Date de création;non;oui;',
    ];

    let yPos = 30;
    aiLines.forEach(line => {
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += line === '' ? 3 : 5;
    });

    doc.save('documentation_import_champs.pdf');
  }, [objectName]);

  // ── File processing ──────────────────────────────────

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (rows.length === 0) {
        toast.error('Le fichier CSV est vide ou invalide');
        return;
      }
      setCsvHeaders(headers);
      setCsvData(rows);

      // Auto-mapping
      const autoMapping: Record<string, string> = {};
      headers.forEach(header => {
        const normalized = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (normalized === 'field_name' || (normalized.includes('nom') && normalized.includes('champ')) || normalized === 'nom') {
          autoMapping[header] = 'field_name';
        } else if (normalized === 'field_type' || normalized === 'type' || (normalized.includes('type') && normalized.includes('champ'))) {
          autoMapping[header] = 'field_type';
        } else if (normalized === 'field_description' || normalized === 'description' || (normalized.includes('desc') && normalized.includes('champ'))) {
          autoMapping[header] = 'field_description';
        } else if (normalized === 'field_required' || normalized.includes('obligatoire') || normalized.includes('required') || normalized === 'requis') {
          autoMapping[header] = 'field_required';
        } else if (normalized === 'field_readonly' || normalized.includes('lecture') || normalized.includes('readonly')) {
          autoMapping[header] = 'field_readonly';
        } else if (normalized === 'field_placeholder' || normalized.includes('placeholder')) {
          autoMapping[header] = 'field_placeholder';
        }
      });

      setMapping(autoMapping);
      setStep('mapping');
    };
    reader.readAsText(file);
  }, []);

  // ── Mapping ──────────────────────────────────────────

  const handleMappingChange = useCallback((csvColumn: string, dbField: string) => {
    setMapping(prev => {
      const newMapping = { ...prev };
      delete newMapping[csvColumn];
      if (dbField !== '__none__') {
        Object.keys(newMapping).forEach(key => {
          if (newMapping[key] === dbField) delete newMapping[key];
        });
        newMapping[csvColumn] = dbField;
      }
      return newMapping;
    });
  }, []);

  const usedDbFields = useMemo(() => new Set(Object.values(mapping)), [mapping]);

  const canProceedToPreview = useMemo(() => {
    return usedDbFields.has('field_name') && usedDbFields.has('field_type');
  }, [usedDbFields]);

  // ── Preview / validation ─────────────────────────────

  const buildFields = useCallback((): { fields: MappedField[]; errors: string[] } => {
    const errors: string[] = [];
    const fields: MappedField[] = [];

    const reverseMapping: Record<string, string> = {};
    Object.entries(mapping).forEach(([csv, db]) => {
      reverseMapping[db] = csv;
    });

    const existingNamesLower = new Set(existingFieldNames.map(n => n.toLowerCase()));
    const seenNames = new Set<string>();

    csvData.forEach((row, index) => {
      const nameCol = reverseMapping['field_name'];
      const typeCol = reverseMapping['field_type'];
      const descCol = reverseMapping['field_description'];
      const requiredCol = reverseMapping['field_required'];
      const readonlyCol = reverseMapping['field_readonly'];
      const placeholderCol = reverseMapping['field_placeholder'];

      const fieldName = row[nameCol]?.trim();
      const fieldTypeRaw = row[typeCol]?.trim();

      if (!fieldName || !fieldTypeRaw) {
        errors.push(`Ligne ${index + 2}: Nom ou type de champ manquant`);
        return;
      }

      const fieldType = validateFieldType(fieldTypeRaw);
      if (!fieldType) {
        errors.push(`Ligne ${index + 2}: Type de champ invalide "${fieldTypeRaw}"`);
        return;
      }

      const nameLower = fieldName.toLowerCase();
      if (existingNamesLower.has(nameLower)) {
        errors.push(`Ligne ${index + 2}: Le champ "${fieldName}" existe déjà dans cet objet`);
        return;
      }

      if (seenNames.has(nameLower)) {
        errors.push(`Ligne ${index + 2}: Doublon "${fieldName}" dans le fichier CSV`);
        return;
      }
      seenNames.add(nameLower);

      fields.push({
        name: fieldName,
        slug: generateSlug(fieldName),
        field_type: fieldType,
        description: descCol ? row[descCol]?.trim() || null : null,
        is_required: requiredCol ? parseBoolean(row[requiredCol]) : false,
        is_readonly: readonlyCol ? parseBoolean(row[readonlyCol]) : false,
        placeholder: placeholderCol ? row[placeholderCol]?.trim() || null : null,
        display_order: existingFieldCount + fields.length + 1,
        hasError: false,
      });
    });

    return { fields, errors };
  }, [csvData, mapping, existingFieldNames, existingFieldCount]);

  const { fields: previewFields, errors: previewErrors } = useMemo(() => {
    if (step === 'preview') return buildFields();
    return { fields: [], errors: [] };
  }, [step, buildFields]);

  const hasErrors = previewErrors.length > 0;

  // ── Import ───────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (hasErrors) {
      toast.error("Corrigez les erreurs avant d'importer");
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: previewFields.length });

    let successCount = 0;
    let errorCount = 0;

    for (const field of previewFields) {
      try {
        await api.post(`/api/business-objects/${objectDefinitionId}/fields`, {
          name: field.name,
          slug: field.slug + '_' + Date.now(),
          field_type: field.field_type,
          description: field.description,
          is_required: field.is_required,
          is_readonly: field.is_readonly,
          placeholder: field.placeholder,
          display_order: field.display_order,
        });
        successCount++;
      } catch (err: unknown) {
        console.error('Error creating field:', err);
        errorCount++;
      }

      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setIsImporting(false);

    await queryClient.invalidateQueries({ queryKey: queryKeys.fieldDefinitions.byObject(objectDefinitionId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.businessObjectDefinitions.all() });

    if (errorCount === 0) {
      toast.success(`Import terminé : ${successCount} champ${successCount > 1 ? 's' : ''} créé${successCount > 1 ? 's' : ''}`);
      onClose();
    } else {
      toast.warning(`Import partiel : ${successCount} réussite${successCount > 1 ? 's' : ''}, ${errorCount} erreur${errorCount > 1 ? 's' : ''}`);
    }
  }, [hasErrors, previewFields, objectDefinitionId, queryClient, onClose]);

  return {
    // Step state
    step,
    setStep,
    resetState,

    // CSV data
    csvData,
    csvHeaders,
    mapping,
    allFields,
    usedDbFields,

    // Handlers
    processFile,
    handleMappingChange,
    canProceedToPreview,
    downloadTemplate,
    downloadDocPdf,

    // Preview
    previewFields,
    previewErrors,
    hasErrors,

    // Import
    isImporting,
    importProgress,
    handleImport,
  };
}
