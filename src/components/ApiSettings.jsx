// src/components/ApiSettings.jsx
import { useState, useEffect } from "react";

const ApiSettings = () => {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Charger la clé API sauvegardée
    chrome.storage.local.get(["claudeApiKey"], (result) => {
      if (result.claudeApiKey) {
        setApiKey(result.claudeApiKey);
        setStatus("Clé API configurée");
      }
    });
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      chrome.storage.local.set({ claudeApiKey: apiKey }, () => {
        setStatus("Clé API sauvegardée !");
        setTimeout(() => setStatus("Clé API configurée"), 2000);
      });
    }
  };

  return (
    <div className="p-4 border-b">
      <h2 className="text-lg font-bold mb-2">Configuration API</h2>
      <div className="flex flex-col space-y-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Entrez votre clé API Claude"
          className="border p-2 rounded"
        />
        <button
          onClick={saveApiKey}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Sauvegarder la clé API
        </button>
        {status && <div className="text-sm text-green-600">{status}</div>}
      </div>
    </div>
  );
};

export default ApiSettings;
