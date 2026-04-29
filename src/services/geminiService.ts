import { GoogleGenAI, Type } from "@google/genai";
import { EnadeQuestion, QuestionType, DifficultyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ENADE_SYSTEM_PROMPT = `Você é um especialista acadêmico brasileiro, experiente na elaboração de questões para o ENADE (Exame Nacional de Desempenho de Estudantes).
Seu objetivo é gerar questões de alta qualidade que sigam rigorosamente o padrão ENADE:
1. Contexto rico e interdisciplinar (textos de apoio, citações).
2. ELEMENTOS VISUAIS: Sempre que relevante, inclua uma descrição visual para uma imagem ou código Mermaid para um diagrama/gráfico (flowchart, pie chart, bar chart, sequence diagram) que complemente o texto base.
3. Enunciado claro que exige análise crítica, não apenas memorização.
4. Para Múltipla Escolha: 5 alternativas (A a E), com apenas uma correta e distratores plausíveis.
5. Para Discursivas: Enunciado que exige resposta estruturada com lógica e fundamentação teórica.
6. Explicação detalhada do porquê a resposta está correta ou dos critérios de avaliação.
7. Sugestões de estudo relacionadas ao tema para aprofundamento.

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
    visualDescription: { type: Type.STRING, description: "Uma descrição detalhada de uma imagem fotográfica ou ilustração que complementaria o contexto (ex: laboratório, cena urbana, etc.)" },
    imageAlt: { type: Type.STRING, description: "Texto alternativo curto para a imagem" },
    visualData: { type: Type.STRING, description: "Código Mermaid.js para um gráfico ou diagrama relevante (opcional, use se um gráfico for mais útil que uma imagem)" },
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

export async function generateGraphicForTopic(topic: string): Promise<{ visualData: string; explanation: string }> {
  const schema = {
    type: Type.OBJECT,
    properties: {
      visualData: { type: Type.STRING, description: "Código Mermaid.js para um diagrama ou gráfico que resume o tópico" },
      explanation: { type: Type.STRING, description: "Uma breve explicação do que o gráfico representa" }
    },
    required: ["visualData", "explanation"]
  };

  const prompt = `Gere um diagrama Mermaid.js (ex: flowchart, mindmap, pie chart) que sintetize os principais conceitos do tópico acadêmico: "${topic}". O objetivo é ser um recurso visual de estudo para o ENADE.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Você é um designer de recursos educacionais focados em aprendizagem visual.",
        responseMimeType: "application/json",
        responseSchema: schema as any
      }
    });

    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error("Error generating graphic:", error);
    throw new Error("Falha ao gerar o recurso visual.");
  }
}
