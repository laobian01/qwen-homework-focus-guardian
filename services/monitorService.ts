
import { AnalysisResult, FocusStatus } from "../types";

// ==================================================================================
// 配置区域：阿里云百炼 (DashScope) - 通义千问
// ==================================================================================

// 阿里云 OpenAI 兼容接口地址
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

// 使用通义千问视觉模型 (qwen-vl-max 效果最好，qwen-vl-plus 性价比高)
const MODEL_NAME = "qwen-vl-max"; 

// ==================================================================================

export const analyzeFrame = async (base64Image: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check settings.");
  }

  // 基础校验
  if (!base64Image || base64Image === "data:," || base64Image.length < 100) {
    throw new Error("Invalid frame captured (empty data)");
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}` // 阿里云使用 Bearer Token 方式
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `你是一个严格但友善的作业监督助手。请分析这张图片中的学生状态。
                
                请严格按照以下 JSON 格式返回（不要包含 Markdown 代码块或其他文字）：
                {
                  "status": "FOCUSED" | "DISTRACTED" | "ABSENT",
                  "message": "一段简短的中文语音提示文本(10字以内)",
                  "confidence": 0.95
                }

                判断规则：
                - FOCUSED (专注): 眼睛看书/本子，正在写字，阅读。
                - DISTRACTED (分心): 东张西望，玩玩具，趴着睡觉，看手机，发呆。
                - ABSENT (离开): 椅子上没人。
                
                message 规则：
                - 专注时: 给予鼓励 (如"坐姿很端正，继续加油")
                - 分心时: 温柔提醒 (如"快快回神，专心写作业")
                - 离开时: 询问去向 (如"人去哪里了呀")
                `
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image // 阿里云支持直接传 Base64 Data URI
                }
              }
            ]
          }
        ],
        temperature: 0.1, // 降低随机性，让判断更稳定
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("API Error Response:", errText);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error("API Key 无效或过期");
      }
      if (response.status === 429) {
        throw new Error("请求太频繁，请稍后再试");
      }
      throw new Error(`请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    // 提取内容
    let content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("AI 返回内容为空");
    }

    // 清洗数据：通义千问有时候会加上 ```json ... ``` 的格式
    content = content.replace(/```json\n?|\n?```/g, "").trim();
    // 有时候会包含 ``` ... ```
    content = content.replace(/```\n?|\n?```/g, "").trim();

    // 解析 JSON
    try {
      const result = JSON.parse(content) as AnalysisResult;
      
      // 安全校验，防止 AI 幻觉输出错误的 status
      const validStatuses = [FocusStatus.FOCUSED, FocusStatus.DISTRACTED, FocusStatus.ABSENT];
      if (!validStatuses.includes(result.status)) {
         result.status = FocusStatus.DISTRACTED; // 默认回退状态
      }
      
      return result;
    } catch (e) {
      console.error("JSON Parse Error. Raw content:", content);
      throw new Error("解析 AI 返回结果失败");
    }

  } catch (error: any) {
    console.error("Analysis failed:", error);
    
    if (error.message === "Invalid frame captured (empty data)") {
        throw error;
    }

    return {
      status: FocusStatus.ERROR,
      message: error.message || "连接错误",
      confidence: 0
    };
  }
};
