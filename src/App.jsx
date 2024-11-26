// src/App.jsx
import { useState } from "react";
import ApiSettings from "./components/ApiSettings";
import { analyzeQuiz } from "./services/claudeService";

function App() {
  const [status, setStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeQuiz") {
      handleQuizAnalysis(request.questions, sendResponse);
      return true; // Keep the message channel open
    }
  });

  const handleQuizAnalysis = async (questions, sendResponse) => {
    if (isProcessing) {
      setStatus("Une analyse est déjà en cours...");
      return;
    }

    try {
      setIsProcessing(true);
      setStatus("Récupération de la clé API...");

      const result = await chrome.storage.local.get(["claudeApiKey"]);
      if (!result.claudeApiKey) {
        throw new Error("Clé API non configurée");
      }

      setStatus(`Analyse de ${questions.length} questions...`);
      const answers = await analyzeQuiz(questions, result.claudeApiKey);

      setStatus("Réponses générées avec succès !");
      sendResponse({ answers });
    } catch (error) {
      setStatus(`Erreur: ${error.message}`);
      sendResponse({ error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-96 p-4">
      <ApiSettings />
      <div className="mt-4">
        <h2 className="text-lg font-bold mb-2">État</h2>
        <div
          className={`text-sm p-2 rounded ${
            isProcessing
              ? "bg-blue-100"
              : status.includes("Erreur")
              ? "bg-red-100"
              : "bg-green-100"
          }`}
        >
          {status || "En attente..."}
        </div>
      </div>
    </div>
  );
}

export default App;
