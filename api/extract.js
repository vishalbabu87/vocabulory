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

const SUPPORTED = new Set(['.pdf', '.docx', '.xlsx']);
const PROMPT = `Act as an expert linguist and assessment designer.
Extract advanced vocabulary from the input text and create high-quality MCQs.
Return ONLY valid JSON array with this exact shape:
[
  {
    "word": "...",
    "meaning": "...",
    "options": ["correct meaning", "challenging distractor", "challenging distractor", "challenging distractor"],
    "category": "Vocabulary"
  }
]
Rules:
- Generate 10 items.
- options must contain exactly 4 strings.
- Include the correct meaning exactly once.
- Distractors must be contextually relevant and plausible.
- No markdown fences.`;

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: false, keepExtensions: true });
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ fields, files });
    });
  });

const cleanJsonArray = (raw) => {
  const text = String(raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');

  if (start === -1 || end === -1) {
    throw new Error('AI response did not include a JSON array.');
  }

  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error('AI response JSON is not an array.');
  }

  return parsed
    .map((item) => ({
      word: item?.word?.toString?.().trim?.() || '',
      meaning: item?.meaning?.toString?.().trim?.() || '',
      options: Array.isArray(item?.options) ? item.options.map((v) => String(v).trim()).filter(Boolean).slice(0, 4) : [],
      category: item?.category?.toString?.().trim?.() || 'Vocabulary'
    }))
    .filter((item) => item.word && item.meaning && item.options.length === 4);
};

const extractText = async (filePath, ext) => {
  if (ext === '.pdf') {
    const content = await readFile(filePath);
    const parsed = await pdfParse(content);
    return parsed.text?.trim() || '';
  }

  if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value?.trim() || '';
  }

  if (ext === '.xlsx') {
    const book = XLSX.readFile(filePath);
    return book.SheetNames.map((sheetName) => {
      const sheet = book.Sheets[sheetName];
      const content = XLSX.utils.sheet_to_csv(sheet);
      return `Sheet: ${sheetName}\n${content}`;
    }).join('\n\n').trim();
  }

  return '';
};

const generateMcqs = async (text) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const ai = new GoogleGenerativeAI(key);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const response = await model.generateContent(`${PROMPT}\n\nSource Text:\n${text}`);
  return cleanJsonArray(response.response.text());
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const { files } = await parseForm(req);
    const input = files.file;
    const file = Array.isArray(input) ? input[0] : input;

    if (!file) {
      res.status(400).json({ error: 'Missing file in `file` field.' });
      return;
    }

    const ext = path.extname(file.originalFilename || '').toLowerCase();
    if (!SUPPORTED.has(ext)) {
      res.status(400).json({ error: 'Unsupported file type. Upload .pdf, .docx, or .xlsx.' });
      return;
    }

    const text = await extractText(file.filepath, ext);
    if (!text) {
      res.status(422).json({ error: 'Unable to extract readable text from file.' });
      return;
    }

    const words = await generateMcqs(text);
    res.status(200).json({ words });
  } catch (error) {
    console.error('extract api error', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
