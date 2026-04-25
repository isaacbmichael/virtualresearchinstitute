import knowledgeBase from "../_data/ask-vri/public-knowledge.md";

const ALLOWED_ORIGINS = new Set([
  "https://virtualresearchinstitute.org",
  "https://www.virtualresearchinstitute.org",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin");

  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const textParts = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

async function fetchCurrentOfferings(env) {
  const url =
    env.CURRENT_OFFERINGS_URL ||
    "https://virtualresearchinstitute.org/assets/data/ask-vri-current-offerings.json";

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.error("Current offerings fetch failed:", response.status, response.statusText);
      return "Current offerings data could not be loaded. Use the stable public knowledge base only.";
    }

    const data = await response.json();

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Current offerings fetch error:", error);
    return "Current offerings data could not be loaded. Use the stable public knowledge base only.";
  }
}

async function callOpenAI(message, env) {
  const currentOfferings = await fetchCurrentOfferings(env);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: `
You are Ask VRI, the public-facing informational assistant for Virtual Research Institute.

Use only the VRI public knowledge base and current VRI offerings data provided below. Do not use outside knowledge unless it is basic conversational reasoning.

Rules:
- Answer in a calm, professional, institutional tone.
- Be concise, but include enough detail to be useful.
- Do not make admissions decisions.
- Do not guarantee acceptance, scholarships, refunds, credits, publication, authorship, recommendation letters, school credit, college credit, mentor placement, or outcomes.
- Do not provide legal, tax, medical, emergency, or individualized safety advice.
- Do not ask users to share sensitive student records or private information in chat.
- If the public information does not clearly answer the question, say that and suggest reviewing the most relevant existing VRI page or contacting VRI.
- Only refer users to existing VRI pages by name: Home, Upcoming Projects, Programs & Pricing, About VRI, Research Archive, Questions & Answers, Policies & Procedures, Virtual Research Foundation, and For Mentors.
- Do not invent page names. For technology questions, refer users to Questions & Answers or Policies & Procedures unless a dedicated technology page is later created.
- For payments, refunds, safety, privacy, conduct, minors, eligibility, or formal enrollment questions, remind users that VRI's published policies, signed agreements, and direct written communication from VRI may govern.

VRI PUBLIC KNOWLEDGE BASE:
${knowledgeBase}

CURRENT VRI OFFERINGS DATA:
The following JSON is generated from VRI's current public Jekyll data files, including pathways, sessions, and public proposal data. Use it for current project offerings, start dates, registration deadlines, program durations, cohort sizes, tuition, mentor names, mentor time zones, schedule notes, and technology requirements.

${currentOfferings}
      `.trim(),
      input: message,
      max_output_tokens: 650
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI API error:", data);
    throw new Error("OpenAI API request failed.");
  }

  return extractOutputText(data) || "I could not generate an answer. Please try again.";
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request)
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        request,
        { error: "Ask VRI only accepts POST requests." },
        405
      );
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse(
        request,
        { error: "Ask VRI is not configured yet." },
        500
      );
    }

    try {
      const body = await request.json();
      const message = typeof body.message === "string" ? body.message.trim() : "";

      if (!message) {
        return jsonResponse(
          request,
          { error: "Please enter a question for Ask VRI." },
          400
        );
      }

      if (message.length > 1200) {
        return jsonResponse(
          request,
          { error: "Please shorten your question and try again." },
          400
        );
      }

      const answer = await callOpenAI(message, env);

      return jsonResponse(request, { answer });
    } catch (error) {
      console.error("Ask VRI Worker error:", error);

      return jsonResponse(
        request,
        { error: "Ask VRI could not answer right now. Please try again later." },
        500
      );
    }
  }
};
