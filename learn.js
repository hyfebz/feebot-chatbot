import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// CommonJS --> require() --> module.exports = ...
// ESModule (ESM) --> import ... from ... --> export default ...

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Hallo, siapa kamu?",
  });
  console.log(response.text);
}

main();