import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatBedrockConverse } from "@langchain/aws";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getGcpProjectId, loadGcpCredentials } from "./gcp";

export type LLMProvider = 'aws' | 'gemini';

/**
 * Build a chat model. An explicit `provider` argument wins; otherwise
 * DEFAULT_LLM_PROVIDER is used, falling back to Gemini.
 */
export function getLLM(provider?: LLMProvider, temperature: number = 0.7): BaseChatModel {
  const selectedProvider = provider || (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'gemini';

  if (selectedProvider === 'gemini') {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    // Use Vertex AI when service account credentials are configured; if they
    // can't be loaded, fall back to an API key below.
    let credentials: Record<string, any> | null = null;
    try {
      credentials = loadGcpCredentials();
    } catch (err) {
      console.warn("Could not load GCP credentials for Vertex AI, trying GEMINI_API_KEY:", err);
    }
    if (credentials) {
      return new ChatVertexAI({
        model,
        location: process.env.GCP_LOCATION || "us-central1",
        temperature,
        authOptions: {
          projectId: getGcpProjectId(credentials),
          credentials,
        },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("No Gemini credentials: set GOOGLE_APPLICATION_CREDENTIALS(_JSON) or GEMINI_API_KEY.");
    }
    return new ChatGoogleGenerativeAI({
      apiKey,
      model,
      temperature,
    });
  }

  // AWS Bedrock
  const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK || process.env.BEDROCK_API_KEY || process.env.AWS_BEDROCK_API_KEY;
  const model = process.env.BEDROCK_MODEL_ID || "openai.gpt-oss-20b-1:0";
  const region = process.env.AWS_REGION || "ap-south-1";

  if (bearerToken && bearerToken !== "your-bedrock-api-key") {
    return new ChatBedrockConverse({
      model,
      region,
      bedrockBearerToken: bearerToken,
      temperature,
    });
  }

  return new ChatBedrockConverse({
    model,
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    temperature,
  });
}

/**
 * Plain text of a model response. `content` can be a string or an array of
 * content blocks (e.g. Bedrock reasoning models return reasoning + text
 * blocks), and calling toString() on the array yields "[object Object]".
 */
export function messageText(message: { content: unknown }): string {
  const { content } = message;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (typeof block === "string") return block;
        if (block?.type === "text" && typeof block.text === "string") return block.text;
        return "";
      })
      .join("");
  }
  return content == null ? "" : String(content);
}
