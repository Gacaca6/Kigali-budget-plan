import { GoogleGenAI, Type } from "@google/genai";
import { BudgetPlan } from "../types";

const apiKey = process.env.API_KEY;

// We initialize the client inside the function calls or lazily to ensure we pick up the key
// but for this structure, we'll instantiate it here assuming the env is ready.
// Per instructions, we use the key directly.
const ai = new GoogleGenAI({ apiKey: apiKey });

export const generateBudgetPlan = async (userInput: string, income?: string): Promise<BudgetPlan> => {
  const modelId = "gemini-2.5-flash";

  const prompt = `
    Act as a financial expert for a user living in Rwanda. 
    Create a budget based on the following user input: "${userInput}".
    ${income ? `The user has a monthly income of: ${income}` : ''}
    
    Context:
    - All currency must be in Rwandan Francs (RWF).
    - If the user is vague (e.g., "I take a moto to work"), estimate reasonable market rates for Kigali.
    - Return a structured JSON response.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          expenses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "Broad category e.g., Food, Transport" },
                item: { type: Type.STRING, description: "Specific item name" },
                estimatedCost: { type: Type.NUMBER, description: "Cost per unit/frequency in RWF" },
                frequency: { type: Type.STRING, description: "Daily, Weekly, Monthly, etc." },
                monthlyTotal: { type: Type.NUMBER, description: "Total calculated cost per month in RWF" },
              },
            },
          },
          totalMonthly: { type: Type.NUMBER, description: "Sum of all monthly totals in RWF" },
          totalWeekly: { type: Type.NUMBER, description: "Average weekly spending derived from monthly total" },
          savingsAdvice: { type: Type.STRING, description: "Brief advice on how to save based on this profile" },
          summary: { type: Type.STRING, description: "A short polite summary of the budget" },
        },
        required: ["expenses", "totalMonthly", "totalWeekly", "savingsAdvice", "summary"],
      },
    },
  });

  if (!response.text) {
    throw new Error("No response received from AI");
  }

  const data = JSON.parse(response.text) as BudgetPlan;
  return data;
};