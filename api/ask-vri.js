import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ALLOWED_ORIGINS = new Set([
  "https://virtualresearchinstitute.org",
  "https://www.virtualresearchinstitute.org",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

function setCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function loadKnowledgeBase() {
  const knowledgePath = path.join(
    process.cwd(),
    "_data",
    "ask-vri",
    "public-knowledge.md"
  );

  return fs.readFile(knowledgePath, "utf8");
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, {
      error: "Ask VRI only accepts POST requests."
    });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 500, {
      error: "Ask VRI is not configured yet."
    });
    return;
  }

  try {
    const { message } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      sendJson(res, 400, {
        error: "Please enter a question for Ask VRI."
      });
      return;
    }

    const cleanMessage = message.trim();

    if (cleanMessage.length > 1200) {
      sendJson(res, 400, {
        error: "Please shorten your question and try again."
      });
      return;
    }

    const knowledgeBase = await loadKnowledgeBase();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: `
You are Ask VRI, the public-facing informational assistant for Virtual Research Institute.

Use only the VRI public knowledge base provided below. Do not use outside knowledge unless it is basic conversational reasoning.

Rules:
- Answer in a calm, professional, institutional tone.
- Be concise, but include enough detail to be useful.
- Do not make admissions decisions.
- Do not guarantee acceptance, scholarships, refunds, credits, publication, authorship, recommendation letters, school credit, college credit, mentor placement, or outcomes.
- Do not provide legal, tax, medical, emergency, or individualized safety advice.
- Do not ask users to share sensitive student records or private information in chat.
- If the public information does not clearly answer the question, say that and suggest the relevant VRI page or contacting VRI.
- For payments, refunds, safety, privacy, conduct, minors, eligibility, or formal enrollment questions, remind users that VRI's published policies, signed agreements, and direct written communication from VRI may govern.

VRI PUBLIC KNOWLEDGE BASE:
${knowledgeBase}
      `.trim(),
      input: cleanMessage
    });

    sendJson(res, 200, {
      answer: response.output_text || "I could not generate an answer. Please try again."
    });
  } catch (error) {
    console.error("Ask VRI error:", error);

    sendJson(res, 500, {
      error: "Ask VRI could not answer right now. Please try again later."
    });
  }
}
