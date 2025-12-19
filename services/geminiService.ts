
import { GoogleGenAI, Type } from "@google/genai";
import { AssetType, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export const analyzeAsset = async (name: string, userNotes: string): Promise<AnalysisResult> => {
  // Use gemini-3-flash-preview for basic text tasks like description generation and classification
  const model = "gemini-3-flash-preview";
  
  // Use the enum values directly in the prompt to ensure the model matches them exactly
  const typeOptions = Object.values(AssetType).join('", "');

  const prompt = `
    我購買了一個新的音訊素材，名稱是 "${name}"。
    這是我的筆記: "${userNotes}"。
    
    請幫我分析並提供以下資訊 (請用繁體中文回答):
    1. 建議一段專業、簡潔的描述 (30字以內)，描述其音色、情緒或適用場景。
    2. 將其嚴格分類為以下其中一種類型: "${typeOptions}"。
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedDescription: { type: Type.STRING },
            suggestedType: { 
              type: Type.STRING,
              enum: Object.values(AssetType)
            }
          },
          required: ["suggestedDescription", "suggestedType"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const suggestCreativeIdea = async (assets: string[]): Promise<string> => {
  // Use gemini-3-flash-preview for creative suggestion tasks
  const model = "gemini-3-flash-preview";
  const prompt = `
    我的音色庫中有這些素材: ${assets.join(', ')}。
    請用繁體中文建議一個有創意的音樂製作或聲音設計點子 (2-3句話)，結合其中至少兩個素材。
    讓這個點子充滿啟發性。
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text || "去創作一些聲音吧！";
  } catch (error) {
    return "暫時無法生成靈感。";
  }
}
