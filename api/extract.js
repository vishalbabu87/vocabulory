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
