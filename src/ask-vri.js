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

function streamingTextResponse(request, stream, status = 200) {
  return new Response(stream, {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff"
    }
  });
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

function buildInstructions(currentOfferings) {
  return `
You are Ask VRI, the public-facing informational assistant for Virtual Research Institute.

Use only the VRI public knowledge base and current VRI offerings data provided below. Do not use outside knowledge unless it is basic conversational reasoning.

Rules:
- Answer in a calm, professional, institutional tone.
- Be concise, but include enough detail to be useful.
- Default to concise answers. For broad questions, give a useful summary first and offer to provide more detail. Do not include every available detail unless the user asks for a detailed list.
- Use simple Markdown formatting for readability: short headings, bullet lists, numbered lists, bold labels, and italics for project titles. Do not return raw HTML.
- When listing many current projects, use a clear scan-friendly structure. Group projects by pathway and session. Use Markdown headings for each pathway/session. For each project, put the project title on its own non-bulleted line using this format: #### *Project Title*. Under each title, list the details as separate compact bullets using exactly these labels: **Topic Area:**, **Mentor:**, and **Overview:**. Do not combine Topic Area, Mentor, and Overview on the same line. Put the start date and registration deadline in the session heading, not repeated under every project.
- If a user asks for all current projects, do not use long stacked plain-text lines. Do not use horizontal rules. Do not use Markdown tables. Do not make project titles bullets. Use short session headings, non-bulleted project titles, and compact indented detail bullets so the answer is easy to scan and finishes completely.
- Current offerings and proposal listings are not guarantees that an offering will run unless the provided public data expressly confirms launch status. Explain that VRI may postpone, revise, merge, cancel, or move offerings to a later session based on enrollment, mentor availability, student fit, scheduling, safety, quality control, and operational needs.
- Do not make admissions decisions.
- Do not guarantee acceptance, scholarships, refunds, credits, publication, authorship, recommendation letters, school credit, college credit, mentor placement, project placement, project launch, schedule changes, makeup sessions, or outcomes.
- Do not provide legal, tax, medical, emergency, or individualized safety advice.
- Do not ask users to share sensitive student records or private information in chat.
- If the public information does not clearly answer the question, say that and suggest reviewing the most relevant existing VRI page or contacting VRI.
- Only refer users to existing VRI pages by name: Home, Upcoming Projects, Programs & Pricing, About VRI, Research Archive, Questions & Answers, Policies & Procedures, Virtual Research Foundation, and For Mentors.
- Do not invent page names. For technology questions, refer users to Questions & Answers or Policies & Procedures unless a dedicated technology page is later created.
- For payments, refunds, safety, privacy, conduct, minors, eligibility, or formal enrollment questions, remind users that VRI's published policies, signed agreements, registration acknowledgments, program-specific pages, and direct written communication from VRI may govern.

VRI PUBLIC KNOWLEDGE BASE:
${knowledgeBase}

CURRENT VRI OFFERINGS DATA:
The following JSON is generated from VRI's current public Jekyll data files, including pathways, sessions, and public proposal data. Use it for current project offerings, start dates, registration deadlines, program durations, cohort sizes, tuition, mentor names, mentor time zones, schedule notes, and technology requirements.

${currentOfferings}
  `.trim();
}

async function createOpenAIStream(message, env) {
  const currentOfferings = await fetchCurrentOfferings(env);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: buildInstructions(currentOfferings),
      input: message,
      max_output_tokens: 2000,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    let errorBody = "";

    try {
      errorBody = await response.text();
    } catch (error) {
      errorBody = "Unable to read OpenAI error response.";
    }

    console.error("OpenAI API error:", response.status, errorBody);
    throw new Error("OpenAI API request failed.");
  }

  const upstreamReader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";

      function enqueueText(text) {
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }

      function handleEventBlock(block) {
        const dataLines = block
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        if (!dataLines.length) {
          return;
        }

        const data = dataLines.join("\n");

        if (!data || data === "[DONE]") {
          return;
        }

        try {
          const event = JSON.parse(data);

          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            enqueueText(event.delta);
          }

          if (event.type === "response.refusal.delta" && typeof event.delta === "string") {
            enqueueText(event.delta);
          }

          if (event.type === "error") {
            console.error("OpenAI streaming event error:", event);
          }
        } catch (error) {
          console.error("OpenAI stream parse error:", error, data);
        }
      }

      try {
        while (true) {
          const { done, value } = await upstreamReader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";

          for (const block of blocks) {
            handleEventBlock(block);
          }
        }

        if (buffer.trim()) {
          handleEventBlock(buffer);
        }

        controller.close();
      } catch (error) {
        console.error("Ask VRI streaming error:", error);
        enqueueText("\n\nAsk VRI could not finish the answer. Please try again later or contact VRI if your question is time-sensitive.");
        controller.close();
      } finally {
        upstreamReader.releaseLock();
      }
    }
  });
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

      const answerStream = await createOpenAIStream(message, env);

      return streamingTextResponse(request, answerStream);
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
