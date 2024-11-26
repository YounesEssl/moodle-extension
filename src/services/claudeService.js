// src/services/claudeService.js
export async function analyzeQuizQuestion(question, apiKey) {
  const prompt = `
Je suis en train de passer un quiz sur Moodle. Voici la question :
"${question.text}"

${
  question.answerType === "radio" || question.answerType === "checkbox"
    ? `Les options possibles sont : ${question.options.join(", ")}`
    : ""
}

${
  question.answerType === "radio"
    ? "Choisis la meilleure réponse parmi les options."
    : question.answerType === "checkbox"
    ? "Sélectionne toutes les réponses correctes."
    : "Donne une réponse concise."
}

Réponds UNIQUEMENT avec la réponse, sans explications ni commentaires.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "claude-3-opus-20240229",
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error("Erreur lors de la requête à Claude:", error);
    throw error;
  }
}

export async function analyzeQuiz(questions, apiKey) {
  const answers = [];
  for (const question of questions) {
    try {
      const answer = await analyzeQuizQuestion(question, apiKey);
      answers.push({
        questionId: question.id,
        answer,
        answerType: question.answerType,
      });
      // Petite pause entre chaque question pour éviter de surcharger l'API
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Erreur pour la question ${question.id}:`, error);
    }
  }
  return answers;
}
