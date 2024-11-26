// src/background.js
const CLAUDE_API_KEY =
  "";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message reçu dans le background:", request);

  if (request.type === "ASK_CLAUDE") {
    (async () => {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-3-opus-20240229",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: request.prompt,
                  },
                ],
              },
            ],
          }),
        });

        console.log("Réponse API status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erreur API:", errorText);
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Réponse API data:", data);

        if (
          data.content &&
          Array.isArray(data.content) &&
          data.content[0] &&
          data.content[0].text
        ) {
          sendResponse({ success: true, answer: data.content[0].text.trim() });
        } else {
          throw new Error("Format de réponse invalide");
        }
      } catch (error) {
        console.error("Erreur API Claude:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

console.log("Background script chargé et prêt !");
