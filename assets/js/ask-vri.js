const ASK_VRI_ENDPOINT = "https://ask-vri.isaac-b-michael.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-ask-vri-form]");
  const input = document.querySelector("[data-ask-vri-input]");
  const output = document.querySelector("[data-ask-vri-output]");
  const submit = document.querySelector("[data-ask-vri-submit]");

  if (!form || !input || !output || !submit) {
    return;
  }

  output.setAttribute("aria-live", "polite");

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatInlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
  }

  function renderMarkdownAnswer(markdown) {
    const lines = String(markdown || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n");

    const htmlParts = [];
    let openList = null;
    let paragraphLines = [];

    function closeParagraph() {
      if (!paragraphLines.length) {
        return;
      }

      htmlParts.push(`<p>${formatInlineMarkdown(paragraphLines.join(" "))}</p>`);
      paragraphLines = [];
    }

    function closeList() {
      if (!openList) {
        return;
      }

      htmlParts.push(`</${openList}>`);
      openList = null;
    }

    function openListOfType(type) {
      if (openList === type) {
        return;
      }

      closeParagraph();
      closeList();
      htmlParts.push(`<${type}>`);
      openList = type;
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        closeParagraph();
        closeList();
        continue;
      }

      const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
      if (headingMatch) {
        closeParagraph();
        closeList();

        const level = headingMatch[1].length === 2 ? "h3" : "h4";
        htmlParts.push(`<${level}>${formatInlineMarkdown(headingMatch[2])}</${level}>`);
        continue;
      }

      const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
      if (unorderedMatch) {
        openListOfType("ul");
        htmlParts.push(`<li>${formatInlineMarkdown(unorderedMatch[1])}</li>`);
        continue;
      }

      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        openListOfType("ol");
        htmlParts.push(`<li>${formatInlineMarkdown(orderedMatch[1])}</li>`);
        continue;
      }

      closeList();
      paragraphLines.push(line);
    }

    closeParagraph();
    closeList();

    return htmlParts.join("");
  }

  function setPlainOutput(message) {
    output.textContent = message;
  }

  function setFormattedOutput(message) {
    output.innerHTML = renderMarkdownAnswer(message);
  }

  async function readErrorMessage(response) {
    const fallback = "Ask VRI could not answer right now.";

    try {
      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        return data.error || fallback;
      }

      const text = await response.text();
      return text || fallback;
    } catch (error) {
      return fallback;
    }
  }

  async function readStreamingAnswer(response) {
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return data.answer || "Ask VRI could not generate an answer. Please try again.";
    }

    if (!response.body) {
      return await response.text();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let answer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          const finalText = decoder.decode();
          if (finalText) {
            answer += finalText;
            setFormattedOutput(answer);
          }
          break;
        }

        answer += decoder.decode(value, { stream: true });
        setFormattedOutput(answer);
      }
    } finally {
      reader.releaseLock();
    }

    return answer;
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();

      if (!submit.disabled) {
        form.requestSubmit();
      }
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = input.value.trim();

    if (!message) {
      output.hidden = false;
      setPlainOutput("Please enter a question for Ask VRI.");
      return;
    }

    input.value = "";
    input.placeholder = "Ask another question...";
    input.focus();

    submit.disabled = true;
    submit.textContent = "Asking...";
    output.hidden = false;
    setPlainOutput("Ask VRI is reviewing the public VRI information...");

    try {
      const response = await fetch(ASK_VRI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const answer = await readStreamingAnswer(response);

      if (!answer.trim()) {
        setPlainOutput("Ask VRI could not generate an answer. Please try again.");
      }
    } catch (error) {
      setPlainOutput(
        "Ask VRI could not answer right now. Please try again later or contact VRI if your question is time-sensitive."
      );
    } finally {
      submit.disabled = false;
      submit.textContent = "Ask VRI";
    }
  });
});
