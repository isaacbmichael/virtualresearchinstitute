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

  const answerPane = output.closest(".ask-vri-answer-pane") || output.parentElement;
  let latestAnswerText = "";
  let copyResetTimer = null;

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "ask-vri-copy-response";
  copyButton.hidden = true;
  copyButton.setAttribute("aria-label", "Copy Ask VRI response");
  copyButton.setAttribute("title", "Copy response");
  copyButton.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M8 8.5A2.5 2.5 0 0 1 10.5 6H18a2.5 2.5 0 0 1 2.5 2.5V16a2.5 2.5 0 0 1-2.5 2.5h-7.5A2.5 2.5 0 0 1 8 16V8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" />
      <path d="M5.5 14H5a2.5 2.5 0 0 1-2.5-2.5V4A2.5 2.5 0 0 1 5 1.5h7.5A2.5 2.5 0 0 1 15 4v.5" fill="none" stroke="currentColor" stroke-width="1.8" />
    </svg>
    <span>Copy response</span>
  `.trim();

  if (answerPane) {
    answerPane.classList.add("ask-vri-answer-pane-has-copy");
    answerPane.insertBefore(copyButton, output);
  }

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

  function updateCopyButtonState({ visible = false, copied = false, failed = false } = {}) {
    if (copyResetTimer) {
      window.clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }

    copyButton.hidden = !visible;

    if (!visible) {
      copyButton.classList.remove("is-copied", "is-error");
      copyButton.setAttribute("aria-label", "Copy Ask VRI response");
      copyButton.setAttribute("title", "Copy response");
      copyButton.querySelector("span").textContent = "Copy response";
      return;
    }

    copyButton.classList.toggle("is-copied", copied);
    copyButton.classList.toggle("is-error", failed);

    if (copied) {
      copyButton.setAttribute("aria-label", "Ask VRI response copied");
      copyButton.setAttribute("title", "Copied");
      copyButton.querySelector("span").textContent = "Copied";
    } else if (failed) {
      copyButton.setAttribute("aria-label", "Copy failed");
      copyButton.setAttribute("title", "Copy failed");
      copyButton.querySelector("span").textContent = "Copy failed";
    } else {
      copyButton.setAttribute("aria-label", "Copy Ask VRI response");
      copyButton.setAttribute("title", "Copy response");
      copyButton.querySelector("span").textContent = "Copy response";
    }
  }

  function setPlainOutput(message) {
    output.textContent = message;
  }

  function setFormattedOutput(message) {
    output.innerHTML = renderMarkdownAnswer(message);
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("Copy command failed.");
    }
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
      latestAnswerText = data.answer || "Ask VRI could not generate an answer. Please try again.";
      setFormattedOutput(latestAnswerText);
      updateCopyButtonState({ visible: Boolean(latestAnswerText.trim()) });
      return latestAnswerText;
    }

    if (!response.body) {
      latestAnswerText = await response.text();
      setFormattedOutput(latestAnswerText);
      updateCopyButtonState({ visible: Boolean(latestAnswerText.trim()) });
      return latestAnswerText;
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
            latestAnswerText = answer;
            setFormattedOutput(latestAnswerText);
            updateCopyButtonState({ visible: Boolean(latestAnswerText.trim()) });
          }
          break;
        }

        answer += decoder.decode(value, { stream: true });
        latestAnswerText = answer;
        setFormattedOutput(latestAnswerText);
        updateCopyButtonState({ visible: Boolean(latestAnswerText.trim()) });
      }
    } finally {
      reader.releaseLock();
    }

    return answer;
  }

  copyButton.addEventListener("click", async () => {
    const textToCopy = latestAnswerText.trim();

    if (!textToCopy) {
      return;
    }

    try {
      await copyText(textToCopy);
      updateCopyButtonState({ visible: true, copied: true });
    } catch (error) {
      updateCopyButtonState({ visible: true, failed: true });
    }

    copyResetTimer = window.setTimeout(() => {
      updateCopyButtonState({ visible: Boolean(latestAnswerText.trim()) });
    }, 1800);
  });

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
      latestAnswerText = "";
      updateCopyButtonState({ visible: false });
      setPlainOutput("Please enter a question for Ask VRI.");
      return;
    }

    input.value = "";
    input.placeholder = "Ask another question...";
    input.focus();

    latestAnswerText = "";
    updateCopyButtonState({ visible: false });

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
        latestAnswerText = "";
        updateCopyButtonState({ visible: false });
        setPlainOutput("Ask VRI could not generate an answer. Please try again.");
      }
    } catch (error) {
      latestAnswerText = "";
      updateCopyButtonState({ visible: false });
      setPlainOutput(
        "Ask VRI could not answer right now. Please try again later or contact VRI if your question is time-sensitive."
      );
    } finally {
      submit.disabled = false;
      submit.textContent = "Ask VRI";
    }
  });
});
