// src/content.js
(() => {
  console.log("Moodle Quiz Assistant Loading...");

  async function askClaude(question) {
    return new Promise((resolve, reject) => {
      const prompt = buildPrompt(question);

      chrome.runtime.sendMessage({ type: "ASK_CLAUDE", prompt }, (response) => {
        if (response.success) {
          resolve(response.answer);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  function buildPrompt(question) {
    let prompt = `Tu es un assistant intelligent qui aide à répondre aux questions d'un quiz Moodle. 
    Question: "${question.text}"`;

    switch (question.type) {
      case "multichoice":
        prompt += `\nC'est une question à choix multiple. Voici les options disponibles:\n${question.options.join(
          "\n"
        )}
        \nSélectionne uniquement une des options listées ci-dessus. Réponds uniquement avec l'option choisie, sans autre texte.`;
        break;
      case "truefalse":
        prompt += `\nC'est une question vrai/faux. Réponds uniquement par "Vrai" ou "Faux".`;
        break;
      case "shortanswer":
        prompt += `\nDonne une réponse courte et précise (quelques mots).`;
        break;
      case "essay":
        prompt += `\nFournis une réponse détaillée et structurée.`;
        break;
      default:
        prompt += `\nDonne la meilleure réponse possible de manière concise.`;
    }

    return prompt;
  }

  function getQuizQuestions() {
    const questions = [];
    const questionSelectors = [
      ".que",
      ".que.multichoice, .que.essay, .que.truefalse, .que.shortanswer",
    ].join(", ");

    document.querySelectorAll(questionSelectors).forEach((questionElem) => {
      const questionText =
        questionElem.querySelector(".qtext")?.textContent.trim() ||
        questionElem.querySelector(".content .text")?.textContent.trim();

      const questionType = questionElem.classList.contains("multichoice")
        ? "multichoice"
        : questionElem.classList.contains("truefalse")
        ? "truefalse"
        : questionElem.classList.contains("essay")
        ? "essay"
        : questionElem.classList.contains("shortanswer")
        ? "shortanswer"
        : "unknown";

      let options = [];
      if (questionType === "multichoice" || questionType === "truefalse") {
        const optionSelectors = [
          ".answer label",
          ".answer .d-flex",
          ".answer .option",
        ];

        for (const selector of optionSelectors) {
          const elements = questionElem.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach((element) => {
              const optionText = element.textContent.trim();
              if (optionText && !options.includes(optionText)) {
                options.push(optionText);
              }
            });
            break;
          }
        }
      }

      if (questionText) {
        questions.push({
          text: questionText,
          type: questionType,
          options,
          element: questionElem,
        });
      }
    });

    console.log("Questions trouvées:", questions);
    return questions;
  }

  function createSuggestionBox() {
    const existingBox = document.getElementById("claude-suggestions");
    if (existingBox) {
      existingBox.innerHTML = "";
      return existingBox;
    }

    const box = document.createElement("div");
    box.id = "claude-suggestions";
    box.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 250px;
      max-height: 70vh;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: Arial, sans-serif;
      display: none;
      font-size: 12px;
      border: 1px solid rgba(0,0,0,0.1);
    `;

    document.body.appendChild(box);
    return box;
  }

  function addSuggestionHeader(box) {
    const header = document.createElement("div");
    header.style.cssText = `
      padding: 8px 12px;
      background: rgba(248, 249, 250, 0.95);
      border-bottom: 1px solid rgba(0,0,0,0.05);
      position: sticky;
      top: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    header.innerHTML = `
      <h3 style="margin: 0; color: #666; font-size: 13px; font-weight: normal;">Claude</h3>
      <button style="background: none; border: none; cursor: pointer; font-size: 16px; color: #999; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">×</button>
    `;

    header.querySelector("button").onclick = () => (box.style.display = "none");
    box.appendChild(header);
  }

  function displaySuggestion(question, answer, number) {
    const suggestionElement = document.createElement("div");
    suggestionElement.style.cssText =
      "padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.05);";

    suggestionElement.innerHTML = `
      <div style="margin-bottom: 6px;">
        <h4 style="margin: 0 0 4px 0; color: #666; font-size: 12px; font-weight: normal;">Q${number}</h4>
        <p style="margin: 0; color: #666; font-size: 11px;">${question.text}</p>
      </div>
      <div style="background: rgba(248, 249, 250, 0.5); padding: 6px 8px; border-radius: 3px; margin-top: 6px;">
        <p style="margin: 0; color: #333; font-size: 12px;">${answer}</p>
      </div>
      ${
        question.options && question.options.length > 0
          ? `
        <div style="margin-top: 6px; font-size: 11px;">
          <div style="color: #666;">Options:</div>
          <ul style="margin: 3px 0 0 0; padding-left: 16px; color: #666;">
            ${question.options
              .map((opt) => `<li style="margin: 2px 0;">${opt}</li>`)
              .join("")}
          </ul>
        </div>
      `
          : ""
      }
    `;

    return suggestionElement;
  }

  async function analyzeQuiz(button) {
    try {
      const questions = getQuizQuestions();
      if (questions.length === 0) {
        throw new Error("Aucune question trouvée");
      }

      const suggestionBox = createSuggestionBox();
      addSuggestionHeader(suggestionBox);
      suggestionBox.style.display = "block";

      button.textContent = "○";
      button.disabled = true;
      button.style.opacity = "0.3";

      for (let i = 0; i < questions.length; i++) {
        try {
          const answer = await askClaude(questions[i]);
          const suggestionElement = displaySuggestion(
            questions[i],
            answer,
            i + 1
          );
          suggestionBox.appendChild(suggestionElement);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Erreur question ${i + 1}:`, error);
          const errorElement = displaySuggestion(
            questions[i],
            `Erreur: ${error.message}`,
            i + 1
          );
          suggestionBox.appendChild(errorElement);
        }
      }

      button.textContent = "•";
      button.disabled = false;
      button.style.opacity = "0.5";
    } catch (error) {
      console.error("Erreur générale:", error);
      button.textContent = "×";
      button.style.opacity = "0.3";
      setTimeout(() => {
        button.textContent = "•";
        button.style.opacity = "0.5";
        button.disabled = false;
      }, 3000);
    }
  }

  function injectToggleExtensionButton() {
    if (document.getElementById("toggle-extension-btn")) return;

    const button = document.createElement("button");
    button.id = "toggle-extension-btn";
    button.innerHTML = "•";
    button.style.cssText = `
      position: fixed;
      bottom: 5px;
      right: 5px;
      z-index: 9999;
      background: rgba(45, 55, 72, 0.3);
      color: white;
      padding: 2px 8px;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      box-shadow: none;
      transition: all 0.3s ease;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
    `;

    let extensionVisible = true;

    function toggleExtensionVisibility() {
      const claudeButton = document.getElementById("claude-assistant-btn");
      const suggestionBox = document.getElementById("claude-suggestions");

      [claudeButton, suggestionBox].forEach((element) => {
        if (element) {
          if (extensionVisible) {
            element.style.display = "none";
          } else {
            if (element === claudeButton) {
              element.style.display = "block";
            } else if (
              element === suggestionBox &&
              element.innerHTML.trim() !== ""
            ) {
              element.style.display = "block";
            }
          }
        }
      });

      extensionVisible = !extensionVisible;
      button.innerHTML = extensionVisible ? "•" : "×";
      button.style.background = extensionVisible
        ? "rgba(45, 55, 72, 0.3)"
        : "rgba(113, 128, 150, 0.3)";
      button.style.opacity = extensionVisible ? "0.5" : "0.3";
    }

    button.addEventListener("mouseover", () => {
      button.style.opacity = "1";
      button.style.transform = "scale(1.2)";
    });

    button.addEventListener("mouseout", () => {
      button.style.opacity = extensionVisible ? "0.5" : "0.3";
      button.style.transform = "scale(1)";
    });

    button.addEventListener("click", toggleExtensionVisibility);
    document.body.appendChild(button);
  }

  function injectButton() {
    if (document.getElementById("claude-assistant-btn")) return;

    const button = document.createElement("button");
    button.id = "claude-assistant-btn";
    button.textContent = "•";
    button.style.cssText = `
      position: fixed;
      bottom: 5px;
      right: 30px;
      z-index: 9999;
      background: rgba(26, 115, 232, 0.2);
      color: #666;
      width: 20px;
      height: 20px;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      opacity: 0.5;
      padding: 0;
    `;

    button.addEventListener("mouseover", () => {
      button.style.opacity = "1";
      button.style.transform = "scale(1.2)";
    });

    button.addEventListener("mouseout", () => {
      button.style.opacity = "0.5";
      button.style.transform = "scale(1)";
    });

    button.addEventListener("click", () => {
      button.style.opacity = "0.3";
      analyzeQuiz(button);
    });

    document.body.appendChild(button);
  }

  function initializeButtons() {
    injectButton();
    injectToggleExtensionButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeButtons);
  } else {
    initializeButtons();
  }

  setTimeout(initializeButtons, 1000);
})();
