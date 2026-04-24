const ASK_VRI_ENDPOINT = "https://ask-vri.isaac-b-michael.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-ask-vri-form]");
  const input = document.querySelector("[data-ask-vri-input]");
  const output = document.querySelector("[data-ask-vri-output]");
  const submit = document.querySelector("[data-ask-vri-submit]");

  if (!form || !input || !output || !submit) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = input.value.trim();

    if (!message) {
      output.hidden = false;
      output.textContent = "Please enter a question for Ask VRI.";
      return;
    }

    submit.disabled = true;
    submit.textContent = "Asking...";
    output.hidden = false;
    output.textContent = "Ask VRI is reviewing the public VRI information...";

    try {
      const response = await fetch(ASK_VRI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ask VRI could not answer right now.");
      }

      output.textContent = data.answer || "Ask VRI could not generate an answer. Please try again.";
    } catch (error) {
      output.textContent =
        "Ask VRI could not answer right now. Please try again later or contact VRI if your question is time-sensitive.";
    } finally {
      submit.disabled = false;
      submit.textContent = "Ask VRI";
    }
  });
});
