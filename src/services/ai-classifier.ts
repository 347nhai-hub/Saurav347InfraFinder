/**
 * Local AI Document Classification & Extraction Service
 * Uses @google/genai SDK with structured JSON Schema output
 * Categorizes engineering documents into: Invoice, Lab Test, Site Memo, DPR, Drawing.
 */

import { GoogleGenAI, Type } from '@google/genai';

export type AiDocumentCategory = 'Invoice' | 'Lab Test' | 'Site Memo' | 'DPR' | 'Drawing';

export interface DocumentAnalysisResult {
  category: AiDocumentCategory;
  confidence: number;
  summary: string;
  chainageDetected?: string;
  packageCode?: string;
  documentNumber?: string;
  keyEntities: string[];
}

// Strict JSON schema definition for Gemini
const classificationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ['Invoice', 'Lab Test', 'Site Memo', 'DPR', 'Drawing'],
      description: 'The primary classification of the highway infrastructure engineering document.',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score between 0.0 and 1.0',
    },
    summary: {
      type: Type.STRING,
      description: 'Concise 2-3 sentence engineering executive summary of the document contents.',
    },
    chainageDetected: {
      type: Type.STRING,
      description: 'Highway chainage range mentioned in the document (e.g. "CH 12+500 to 14+000"), or empty string if none.',
    },
    packageCode: {
      type: Type.STRING,
      description: 'Contract package code (e.g. "PKG-01", "Package 2"), or empty string if none.',
    },
    documentNumber: {
      type: Type.STRING,
      description: 'Official document, drawing, or bill reference number if visible.',
    },
    keyEntities: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: 'Key parties, locations, materials, or equipment mentioned (e.g. NHAI, Dilip Buildcon, Grade 43 Cement, Bitumen VG-30).',
    },
  },
  required: ['category', 'confidence', 'summary', 'keyEntities'],
};

/**
 * Classifies document text and extracts highway engineering metadata.
 */
export async function classifyEngineeringDocument(
  fileName: string,
  extractedContent: string,
  apiKey?: string
): Promise<DocumentAnalysisResult> {
  const key = apiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

  // Fallback heuristic classifier when offline or no API key configured
  if (!key) {
    return heuristicFallbackClassification(fileName, extractedContent);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });

    const prompt = `Analyze this civil highway infrastructure document and classify it.
File Name: ${fileName}

Document Text Sample:
${extractedContent.slice(0, 4000)}

Classify the document strictly into one of: 'Invoice', 'Lab Test', 'Site Memo', 'DPR', 'Drawing'.
Extract key metadata including chainage references, contract package, and key entities.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: classificationResponseSchema,
        temperature: 0.1, // Deterministic classification
      },
    });

    if (!response.text) {
      throw new Error('No response returned by AI model');
    }

    const parsed = JSON.parse(response.text) as DocumentAnalysisResult;
    return parsed;
  } catch (err) {
    console.warn('AI classification failed, falling back to heuristic engine:', err);
    return heuristicFallbackClassification(fileName, extractedContent);
  }
}

/**
 * High-speed offline heuristic fallback when AI model is not accessible.
 */
export function heuristicFallbackClassification(
  fileName: string,
  content: string
): DocumentAnalysisResult {
  const lower = (fileName + ' ' + content).toLowerCase();

  let category: AiDocumentCategory = 'Site Memo';
  let confidence = 0.75;

  if (lower.match(/\b(invoice|ra\s*bill|tax\s*invoice|ipc|payment\s*cert|running\s*account)\b/)) {
    category = 'Invoice';
    confidence = 0.92;
  } else if (lower.match(/\b(cube\s*test|compressive\s*strength|compaction|lab\s*test|marshall|bitumen\s*grade|is\s*2720|is\s*516)\b/)) {
    category = 'Lab Test';
    confidence = 0.9;
  } else if (lower.match(/\b(dpr|daily\s*progress|mpr|monthly\s*progress|progress\s*report|weather\s*condition|plant\s*machinery)\b/)) {
    category = 'DPR';
    confidence = 0.94;
  } else if (lower.match(/\b(dwg|dxf|plan|profile|typical\s*cross\s*section|tcs|alignment|culvert\s*drawing|structural\s*detail)\b/)) {
    category = 'Drawing';
    confidence = 0.88;
  }

  // Regex chainage detection
  const chainageMatch = lower.match(/(?:ch|chainage|km)[\s.:]*(\d+\+\d{1,3}(?:\s*(?:to|-)\s*\d+\+\d{1,3})?)/i);
  const chainageDetected = chainageMatch ? chainageMatch[0].toUpperCase() : undefined;

  // Package detection
  const pkgMatch = lower.match(/pkg[\s_-]?\d+|package[\s_-]?\d+/i);
  const packageCode = pkgMatch ? pkgMatch[0].toUpperCase() : undefined;

  return {
    category,
    confidence,
    summary: `Heuristically classified as ${category} based on document keywords and filename patterns.`,
    chainageDetected,
    packageCode,
    keyEntities: ['Auto-Detected Entity'],
  };
}
