import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import cors from 'cors';

const extractGeneratedText = (data) => {
  try {
    const text =
      data?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.response?.candidates?.[0]?.content?.text;

    return text ?? JSON.stringify(data, null, 2);
  } catch (err) {
    console.error("Gagal ketika mengambil text:", err);
    return JSON.stringify(data, null, 2);
  }
};

// declare variable untuk express
const app = express();
// declare variable untuk multer
const upload = multer();

// buat 2 variable ajaib (magic variable)
// __
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// declare variable default-nya
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_PORT = 3000;

// utility variable untuk membuat satu object mapper
const modelMapper = {
  'flash': 'gemini-2.5-flash',
  'flash-lite': 'gemini-2.5-flash-lite',
  'pro': 'gemini-2.5-pro',
};

// helper function untuk menentukan model gemini
const determineGeminiModel = (key) => {
  return modelMapper[key] ?? DEFAULT_GEMINI_MODEL;
};

// instantiation --> memanggil class menjadi sebuah instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// memanggil middleware untuk bisa handle CORS
app.use(cors());

// memanggil middleware untuk bisa terima header
// dengan Content-Type: application/json
app.use(express.json());

// panggil middleware untuk serve static file
app.use(express.static(path.join(__dirname, 'public')));

// tambah routing untuk handle model-nya
// app.post('/', (req, res) => {})

// 1. Generate Text
// Endpoint untuk menghasilkan teks
app.post("/generate-text", async (req, res) => {
  try {
    const prompt = req.body?.prompt;

    // guard clause
    if (!prompt) {
      res.status(400).json({ message: "Belum ada prompt yang diisi!" });
      return;
    }

    const aiResponse = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: prompt,
    });

    res.json({ result: extractGeneratedText(aiResponse) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/chat", async (req, res) => {
  try {
    if (!req.body) {
      // perlu ada payload yang dikirim
      // HTTP 400 --> Bad Request
      //      ^   --> user yang melakukan "kesalahan"
      //       ^^ --> 404 --> Not Found (nggak ketemu halaman/item-nya)
      //          --> 403 --> Forbidden (akses tidak dibolehkan)
      //          --> 401 --> Unauthorized (belum login)
      return res.json(400, "Invalid request body!");
    }

    // extract messages dari request body
    const { messages } = req.body;

    // cek messages-nya
    if (!messages) {
      // kirim kalau nggak ada message-nya
      return res.json(400, "Pesannya masih kosong nih!");
    }

    const payload = messages.map((msg) => {
      return {
        role: msg.role,
        parts: [{ text: msg.content }],
      };
    });

    const aiResponse = await ai.models.generateContent({
      model: determineGeminiModel('pro'),
      contents: payload,
      config: {
        systemInstruction:
          "Anda adalah seorang asisten AI yang bertugas membantu pengguna dalam memberikan informasi dan bantuan.",
      },
    });

    res.json({ reply: extractGeneratedText(aiResponse) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 2. Generate From Image
// Endpoint untuk menghasilkan teks dari gambar
app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  try {
    const prompt = req.body?.prompt;

    // guard clause 1
    if (!prompt) {
      res.status(400).json({ message: "Belum ada prompt yang diisi!" });
      return;
    }

    const file = req.file;

    // guard clause
    if (!file) {
      res.status(400).json({ message: "File 'image' harus di-upload!" });
      return;
    }

    const imgBase64 = file.buffer.toString("base64");

    const aiResponse = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: file.mimetype, data: imgBase64 } },
      ],
    });

    res.json({ result: extractGeneratedText(aiResponse) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Generate From Document
// Endpoint untuk menghasilkan teks dari dokumen
app.post(
  "/generate-from-document",
  upload.single("document"),
  async (req, res) => {
    try {
      const prompt = req.body?.prompt;

      // guard clause 1
      if (!prompt) {
        res.status(400).json({ message: "Belum ada prompt yang diisi!" });
        return;
      }

      const file = req.file;

      // guard clause
      if (!file) {
        res.status(400).json({ message: "File document harus di-upload!" });
        return;
      }

      const docBase64 = file.buffer.toString("base64");
      const aiResponse = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: [
          { text: prompt },
          { inlineData: { mimeType: file.mimetype, data: docBase64 } },
        ],
      });
      res.json({ result: extractGeneratedText(aiResponse) });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 4. Generate From Audio
// Endpoint untuk menghasilkan teks dari audio
app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  try {
    const prompt = req.body?.prompt;

    // guard clause 1
    if (!prompt) {
      res.status(400).json({ message: "Belum ada prompt yang diisi!" });
      return;
    }

    const file = req.file;

    // guard clause
    if (!file) {
      res.status(400).json({ message: "File document harus di-upload!" });
      return;
    }

    const audioBase64 = req.file.buffer.toString("base64");
    const aiResponse = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: req.file.mimetype, data: audioBase64 } },
      ],
    });
    res.json({ result: extractGeneratedText(aiResponse) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(DEFAULT_PORT, () => {
  console.log("Server Running!!!");
  console.log("Buka di sini: http://localhost:3000");
});
