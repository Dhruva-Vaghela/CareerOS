import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { ResumeExtractionModel, type IResumeExtractionDocument } from '../db/schema.js';

const MAX_EXTRACTED_CHARACTERS = 250_000;
const OCR_PAGE_LIMIT = 8;
const OCR_TEXT_THRESHOLD = 700;
const SUPPORTED_HEADINGS = [
  'summary', 'professional summary', 'career summary', 'professional profile', 'profile', 'objective',
  'experience', 'work experience', 'professional experience', 'employment history', 'work history', 'career history',
  'education', 'academic background', 'skills', 'technical skills', 'core skills', 'core competencies', 'technical expertise',
  'projects', 'certifications', 'certificates', 'licenses', 'awards', 'publications', 'languages', 'volunteer experience',
  'leadership', 'key achievements', 'interests',
];

export interface ResumeExtractionResult {
  resumeId: string;
  version: number;
  status: 'COMPLETED' | 'FAILED';
  parsedContent: {
    plainText?: string;
    wordCount?: number;
    pageCount?: number;
    sections?: Record<string, string>;
    source?: 'TEXT' | 'OCR';
    layout?: 'SINGLE_COLUMN' | 'TABLE_OR_COLUMNS' | 'UNCERTAIN';
    warnings?: string[];
  };
  errorMessage?: string;
  createdAt: Date;
}

function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let activeHeading = 'other';
  const lines: string[] = [];
  const flush = () => {
    if (lines.length) sections[activeHeading] = lines.splice(0).join('\n').trim();
  };

  for (const line of text.split('\n')) {
    const cells = line.split(' | ').map((cell) => cell.trim()).filter(Boolean);
    const parsedHeading = cells.map((cell, index) => {
      const inline = cell.match(/^(.+?)\s*:\s*(.+)$/);
      const candidate = (inline?.[1] ?? cell).toLowerCase().replace(/[:\s]+$/, '').trim();
      return SUPPORTED_HEADINGS.includes(candidate) ? { heading: candidate, index, trailing: inline?.[2] ?? '' } : null;
    }).find(Boolean);
    if (parsedHeading) {
      flush();
      activeHeading = parsedHeading.heading;
      const remainder = [parsedHeading.trailing, ...cells.filter((_cell, index) => index !== parsedHeading.index)].filter(Boolean).join(' | ');
      if (remainder) lines.push(remainder);
      continue;
    }
    lines.push(line);
  }
  flush();
  return sections;
}

let ocrWorkerPromise: Promise<Worker> | undefined;

function getOCRWorker(): Promise<Worker> {
  if (!ocrWorkerPromise) {
    const langPath = process.env.RESUME_OCR_LANG_PATH;
    ocrWorkerPromise = createWorker('eng', undefined, langPath ? { langPath } : undefined).catch((error) => {
      ocrWorkerPromise = undefined;
      throw error;
    });
  }
  return ocrWorkerPromise;
}

async function recognizeScannedPDF(parser: PDFParse, pageCount: number): Promise<{ text: string; pagesProcessed: number }> {
  const pagesToProcess = Math.min(pageCount, OCR_PAGE_LIMIT);
  const screenshots = await parser.getScreenshot({ first: pagesToProcess, scale: 1.7, imageBuffer: true, imageDataUrl: false });
  const worker = await getOCRWorker();
  const pageTexts: string[] = [];
  for (const page of screenshots.pages) {
    const result = await worker.recognize(Buffer.from(page.data));
    if (result.data.text.trim()) pageTexts.push(result.data.text.trim());
  }
  return { text: pageTexts.join('\n\n'), pagesProcessed: screenshots.pages.length };
}

function detectLayout(text: string): 'SINGLE_COLUMN' | 'TABLE_OR_COLUMNS' | 'UNCERTAIN' {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const separatedRows = lines.filter((line) => line.includes(' | ')).length;
  if (separatedRows >= 2) return 'TABLE_OR_COLUMNS';
  if (lines.length < 10) return 'SINGLE_COLUMN';
  const fragmented = lines.filter((line) => line.length < 3).length;
  const longRuns = lines.filter((line) => line.length > 180).length;
  return fragmented / lines.length > 0.2 || longRuns / lines.length > 0.25 ? 'UNCERTAIN' : 'SINGLE_COLUMN';
}

function toResult(doc: IResumeExtractionDocument): ResumeExtractionResult {
  return {
    resumeId: doc.resumeId,
    version: doc.version,
    status: doc.status,
    parsedContent: doc.parsedContent,
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt,
  };
}

export class ResumeExtractionService {
  async extractAndSave(input: {
    resumeId: string;
    version: number;
    filename: string;
    buffer: Buffer;
  }): Promise<ResumeExtractionResult> {
    const now = new Date();
    let ocrAttempted = false;
    try {
      const extension = input.filename.toLowerCase().split('.').pop();
      let extractedText: string;
      let pageCount: number | undefined;
      let source: 'TEXT' | 'OCR' = 'TEXT';
      const warnings: string[] = [];

      if (extension === 'pdf') {
        const parser = new PDFParse({ data: input.buffer });
        try {
          const result = await parser.getText({ lineEnforce: true, cellSeparator: ' | ', pageJoiner: '\n' });
          extractedText = result.text;
          pageCount = result.total;
          if (normalizeText(extractedText).length < OCR_TEXT_THRESHOLD) {
            ocrAttempted = true;
            try {
              const ocr = await recognizeScannedPDF(parser, pageCount);
              if (normalizeText(ocr.text).length > normalizeText(extractedText).length) {
                extractedText = ocr.text;
                source = 'OCR';
                if (pageCount > ocr.pagesProcessed) warnings.push(`OCR processed the first ${ocr.pagesProcessed} of ${pageCount} pages due to the page limit.`);
              } else if (!normalizeText(extractedText)) {
                throw new Error('OCR could not recognize selectable text in this scanned PDF. Try a clearer scan or upload a DOCX.');
              }
            } catch (ocrError) {
              if (!normalizeText(extractedText)) throw ocrError;
              warnings.push('OCR could not be completed. Partial selectable text was retained; verify that the full resume was captured.');
            }
          }
        } finally {
          await parser.destroy();
        }
      } else if (extension === 'docx') {
        const result = await mammoth.convertToHtml({ buffer: input.buffer });
        if (result.messages.some((message) => message.type === 'warning')) warnings.push('Some DOCX structure could not be converted. Review extracted sections before relying on the analysis.');
        extractedText = result.value
          .replace(/<\/(?:p|div|h[1-6]|tr|li)>/gi, '\n')
          .replace(/<\/(?:td|th)>/gi, ' | ')
          .replace(/<li\b[^>]*>/gi, '• ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'");
      } else {
        throw new Error('Unsupported file type');
      }

      const plainText = normalizeText(extractedText);
      if (!plainText) throw new Error('No readable text was found. Upload a clearer PDF or DOCX resume.');
      const layout = detectLayout(plainText);
      if (layout === 'TABLE_OR_COLUMNS') warnings.push('Repeated table or column separators were detected. Cell boundaries were retained; confirm that cross-column reading order is correct.');
      if (layout === 'UNCERTAIN') warnings.push('Dense or fragmented text was detected. Confirm section order and extracted text before relying on ATS results.');
      if (wordCount(plainText) < 80) warnings.push('A small amount of text was extracted. Check that all resume pages and sections were captured.');
      const parsedContent = {
        plainText,
        wordCount: wordCount(plainText),
        ...(pageCount === undefined ? {} : { pageCount }),
        sections: extractSections(plainText),
        source,
        layout,
        warnings,
      };
      const doc = await ResumeExtractionModel.findOneAndUpdate(
        { resumeId: input.resumeId, version: input.version },
        { $set: { status: 'COMPLETED', parsedContent, errorMessage: undefined, createdAt: now } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
      if (!doc) throw new Error('Could not save extracted resume text');
      return toResult(doc);
    } catch (error) {
      const errorMessage = error instanceof Error && (error.message.includes('OCR could not recognize') || error.message.includes('No readable text'))
        ? error.message
        : ocrAttempted
          ? 'OCR could not process this scanned PDF. Check OCR language data availability or upload a PDF with selectable text.'
          : 'The resume could not be read. Please upload a valid PDF or DOCX file.';
      const doc = await ResumeExtractionModel.findOneAndUpdate(
        { resumeId: input.resumeId, version: input.version },
        { $set: { status: 'FAILED', parsedContent: {}, errorMessage, createdAt: now } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
      if (!doc) throw new Error('Could not save resume extraction status');
      return toResult(doc);
    }
  }

  async get(resumeId: string, version: number): Promise<ResumeExtractionResult | null> {
    const doc = await ResumeExtractionModel.findOne({ resumeId, version });
    return doc ? toResult(doc) : null;
  }
}
