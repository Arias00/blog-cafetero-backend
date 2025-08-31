// backend/controllers/aiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../models/db');

if (!process.env.GOOGLE_API_KEY) {
    console.error("\n\nERROR FATAL: La variable GOOGLE_API_KEY no está definida en el archivo .env\n\n");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

exports.chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "No se proporcionó ningún mensaje." });
    }

    const [articles] = await db.query(
      "SELECT title FROM articles WHERE status = 'published' ORDER BY created_at DESC LIMIT 5"
    );
    const articleTitles = articles.map(a => `- ${a.title}`).join('\n');
    
    // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    
    const prompt = `
      Eres 'Orígenes IA', un asistente experto en café, amigable y apasionado, integrado en un blog llamado "Orígenes".
      
      CONTEXTO DEL BLOG:
      Estos son algunos de los últimos artículos publicados en el blog:
      ${articleTitles}
      
      INSTRUCCIONES:
      - Responde a la pregunta del usuario basándote en tu conocimiento general sobre café y, si es relevante, menciona los artículos del blog como contexto.
      - Si el usuario pregunta sobre qué hay en el blog, usa la lista de artículos que te he dado para responder.
      - Sé siempre amable y conversacional.
      - NO menciones que eres un modelo de lenguaje. Eres 'Orígenes IA'.
      - Si no sabes la respuesta, di algo como "Esa es una excelente pregunta, pero no tengo la información en este momento."

      PREGUNTA DEL USUARIO:
      "${message}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error("\n\n===== ERROR EN EL CHAT CON IA =====");
    console.error(error); // Imprimimos el error detallado que vimos
    console.error("=================================\n\n");
    res.status(500).json({ message: "Error al comunicarse con el asistente de IA." });
  }
};