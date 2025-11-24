import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FocusStatus } from "../types";

export const analyzeFrame = async (base64Image: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check settings.");
  }

  // 基础校验
  if (!base64Image || base64Image === "data:," || base64Image.length < 100) {
    throw new Error("Invalid frame captured (empty data)");
  }

  // Parse Base64 Data URI
  // The input from CameraFeed is typically `data:image/jpeg;base64,...`
  const match = base64Image.match(/^data:(.+);base64,(.+)$/);
  let mimeType = "image/jpeg";
  let data = base64Image;

  if (match) {
    mimeType = match[1];
    data = match[2];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: "请分析这张图片中的学生状态。",
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
            },
          },
        ],
      },
      config: {
        systemInstruction: `你是一个严格但友善的作业监督助手。

判断规则：
- FOCUSED (专注): 眼睛看书/本子，正在写字，阅读。
- DISTRACTED (分心): 东张西望，玩玩具，趴着睡觉，看手机，发呆。
- ABSENT (离开): 椅子上没人。

message 规则：
- 专注时: 给予鼓励 (如"坐姿很端正，继续加油")
- 分心时: 温柔提醒 (如"快快回神，专心写作业")
- 离开时: 询问去向 (如"人去哪里了呀")`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              enum: [FocusStatus.FOCUSED, FocusStatus.DISTRACTED, FocusStatus.ABSENT],
            },
            message: {
              type: Type.STRING,
              description: "一段简短的中文语音提示文本(10字以内)",
            },
            confidence: {
              type: Type.NUMBER,
            },
          },
          required: ["status", "message", "confidence"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI 返回内容为空");
    }

    const result = JSON.parse(text) as AnalysisResult;

    // Safety check for status
    const validStatuses = [FocusStatus.FOCUSED, FocusStatus.DISTRACTED, FocusStatus.ABSENT];
    if (!validStatuses.includes(result.status)) {
      result.status = FocusStatus.DISTRACTED;
    }

    return result;

  } catch (error: any) {
    console.error("Analysis failed:", error);

    return {
      status: FocusStatus.ERROR,
      message: error.message || "连接错误",
      confidence: 0,
    };
  }
};
