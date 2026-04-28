import { GoogleGenAI, Type } from "@google/genai";
import { EnadeQuestion, QuestionType, DifficultyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ENADE_SYSTEM_PROMPT = `Você é um especialista acadêmico brasileiro, experiente na elaboração de questões para o ENADE (Exame Nacional de Desempenho de Estudantes).
Seu objetivo é gerar questões de alta qualidade que sigam rigorosamente o padrão ENADE:
1. Contexto rico e interdisciplinar (textos de apoio, gráficos descritos, citações).
2. Enunciado claro que exige análise crítica, não apenas memorização.
3. Para Múltipla Escolha: 5 alternativas (A a E), com apenas uma correta e distratores plausíveis.
4. Para Discursivas: Enunciado que exige resposta estruturada com lógica e fundamentação teórica.
5. Explicação detalhada do porquê a resposta está correta ou dos critérios de avaliação.
6. Sugestões de estudo relacionadas ao tema para aprofundamento.

IMPORTANTE: Você deve respeitar o nível de dificuldade solicitado (1 a 5):
- Nível 1: Compreensão básica e aplicação direta.
- Nível 3: Análise e síntese moderada.
- Nível 5: Avaliação complexa, interdisciplinaridade profunda e pensamento crítico avançado.

Responda SEMPRE em Português do Brasil.`;

export async function generateEnadeQuestion(
  topic: string, 
  type: QuestionType, 
  difficulty: DifficultyLevel
): Promise<EnadeQuestion> {
  const isMultipleChoice = type === 'multiple_choice';

  const properties: any = {
    type: { type: Type.STRING },
    topic: { type: Type.STRING },
    difficulty: { type: Type.NUMBER },
    context: { type: Type.STRING, description: "O texto base ou situação-problema da questão" },
    question: { type: Type.STRING, description: "A pergunta ou comando da questão" },
    explanation: { type: Type.STRING, description: "Justificativa da resposta ou gabarito comentado" },
    studySuggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          description: { type: Type.STRING },
          resources: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["topic", "description", "resources"]
      }
    }
  };

  const required = ["type", "topic", "difficulty", "context", "question", "explanation", "studySuggestions"];

  if (isMultipleChoice) {
    properties.options = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          letter: { type: Type.STRING },
          text: { type: Type.STRING }
        },
        required: ["letter", "text"]
      }
    };
    properties.correctAnswer = { type: Type.STRING };
    required.push("options", "correctAnswer");
  } else {
    properties.evaluationCriteria = {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    };
    required.push("evaluationCriteria");
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties,
    required
  };

  const prompt = `Gere uma questão do tipo ${type === 'multiple_choice' ? 'Múltipla Escolha' : 'Discursiva'} sobre o tópico "${topic}" com nível de dificuldade ${difficulty} de 5.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: ENADE_SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    const question = JSON.parse(result.text || "{}") as EnadeQuestion;
    
    // Ensure metadata is consistent
    question.id = crypto.randomUUID();
    question.type = type;
    question.topic = topic;
    question.difficulty = difficulty;
    question.createdAt = Date.now();
    
    return question;
  } catch (error) {
    console.error("Error generating question:", error);
    throw new Error("Falha ao gerar a questão. Por favor, tente novamente.");
  }
}
