import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { IncomingForm } from 'formidable';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: false
  }
};

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.xlsx']);

const PROMPT = [
  'You are an expert linguist and assessment designer.',
  'Extract 10 advanced vocabulary words from the source text.',
  'Return ONLY valid JSON array with this exact shape:',
  '[{ "word": "", "meaning": "", "options": ["", "", "", ""], "category": "Vocabulary" }]',
  'Rules:',
  '- options must have exactly 4 items.',
  '- include the correct meaning exactly once in options.',
  '- all distractors should be plausible and context-aware.',
  '- do not include markdown code fences.'
].join('\n');

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: false, keepExtensions: true });
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ fields, files });
    });
  });
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const word = typeof item?.word === 'string' ? item.word.trim() : '';
      const meaning = typeof item?.meaning === 'string' ? item.meaning.trim() : '';
      const category = typeof item?.category === 'string' && item.category.trim() ? item.category.trim() : 'Vocabulary';
      const options = Array.isArray(item?.options)
        ? item.options.map((v) => String(v).trim()).filter(Boolean).slice(0, 4)
        : [];

      return { word, meaning, options, category };
    })
    .filter((item) => item.word && item.meaning && item.options.length === 4);
}

function parseGeminiJson(rawText) {
  const clean = String(rawText || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');

  if (start === -1 || end === -1) {
    throw new Error('Model output did not contain JSON array.');
  }

  const parsed = JSON.parse(clean.slice(start, end + 1));
  return normalizeItems(parsed);
}

async function extractText(filePath, extension) {
  if (extension === '.pdf') {
    const buffer = await readFile(filePath);
    const result = await pdfParse(buffer);
    return (result.text || '').trim();
  }

  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return (result.value || '').trim();
  }

  if (extension === '.xlsx') {
    const workbook = XLSX.readFile(filePath);
    const text = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return `Sheet: ${sheetName}\n${csv}`;
    }).join('\n\n');
    return text.trim();
  }

  return '';
}

async function generateWords(sourceText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const response = await model.generateContent(`${PROMPT}\n\nSource Text:\n${sourceText}`);
  const text = response.response.text();
  const words = parseGeminiJson(text);

  if (!words.length) {
    throw new Error('AI returned empty vocabulary set.');
  }

  return words;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const { files } = await parseMultipart(req);
    const fileInput = files.file;
    const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded in `file` field.' });
      return;
    }

    const extension = path.extname(file.originalFilename || '').toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      res.status(400).json({ error: 'Unsupported file type. Please upload .pdf, .docx, or .xlsx.' });
      return;
    }

    const extracted = await extractText(file.filepath, extension);
    if (!extracted) {
      res.status(422).json({ error: 'Failed to extract readable text from uploaded file.' });
      return;
    }

    const words = await generateWords(extracted);

    res.status(200).json({
      words,
      meta: {
        extension,
        characters: extracted.length
      }
    });
  } catch (error) {
    console.error('extract api error:', error);
    res.status(500).json({ error: error.message || 'Internal server error.' });
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Note: In a real serverless env, we'd use a multipart parser. 
    // This logic assumes the file text or buffer is passed.
    const { fileData, fileType } = JSON.parse(req.body);
    let extractedText = "";

    if (fileType === "application/pdf") {
      const data = await pdf(Buffer.from(fileData, 'base64'));
      extractedText = data.text;
    } else if (fileType.includes("word")) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(fileData, 'base64') });
      extractedText = result.value;
    } else {
      extractedText = "Unsupported format";
    }

    const prompt = `Extract 10 difficult vocabulary words from this text. 
    Create a 4-option MCQ quiz for each. Return ONLY a JSON array:
    [{"word": "...", "meaning": "...", "options": ["A", "B", "C", "D"], "category": "Imported"}]
    Text: ${extractedText.substring(0, 5000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "");
    
    return res.status(200).json(JSON.parse(text));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
