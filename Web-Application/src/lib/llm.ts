import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatBedrockConverse } from "@langchain/aws";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getGcpProjectId, loadGcpCredentials } from "./gcp";

export type LLMProvider = 'aws' | 'gemini';

export function getGeminiModel(configuredModel = process.env.GEMINI_MODEL): string {
  return configuredModel?.trim() || 'gemini-2.5-flash';
}

export function shouldUseVertexAI(apiKey: string | undefined, transport = process.env.GEMINI_TRANSPORT): boolean {
  const selectedTransport = transport?.trim().toLowerCase();
  if (selectedTransport && selectedTransport !== 'api-key' && selectedTransport !== 'vertex') {
    throw new Error("GEMINI_TRANSPORT must be 'api-key' or 'vertex'.");
  }
  return selectedTransport === 'vertex' || (selectedTransport !== 'api-key' && !apiKey);
}

/**
 * Build a chat model. An explicit `provider` argument wins; otherwise
 * DEFAULT_LLM_PROVIDER is used, falling back to Gemini.
 */
export function getLLM(provider?: LLMProvider, temperature: number = 0.7): BaseChatModel {
  const selectedProvider = provider || (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'gemini';

  if (selectedProvider === 'gemini') {
    const model = getGeminiModel();
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const useVertexAI = shouldUseVertexAI(apiKey);

    if (!useVertexAI && !apiKey) {
      throw new Error("GEMINI_TRANSPORT=api-key requires GEMINI_API_KEY or GOOGLE_API_KEY.");
    }
    if (!useVertexAI && apiKey) {
      return new ChatGoogleGenerativeAI({
        apiKey,
        model,
        temperature,
      });
    }

    // Storage service-account credentials should not force Vertex AI when a
    // Gemini API key is configured. Set GEMINI_TRANSPORT=vertex to opt in.
    let credentials: Record<string, any> | null = null;
    try {
      credentials = loadGcpCredentials();
    } catch (err) {
      console.warn("Could not load GCP credentials for Vertex AI:", err);
    }
    if (credentials) {
      return new ChatVertexAI({
        // Suppress @langchain/google-common's GOOGLE_API_KEY fallback so the
        // supplied service-account credentials are actually used.
        apiKey: "",
        model,
        location: process.env.GCP_LOCATION || "us-central1",
        temperature,
        authOptions: {
          projectId: getGcpProjectId(credentials),
          credentials,
        },
      });
    }

    throw new Error("Vertex AI was selected, but no valid Google Cloud service-account credentials were found.");
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
