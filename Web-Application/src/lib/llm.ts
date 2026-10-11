import path from "path";
import fs from "fs";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatBedrockConverse } from "@langchain/aws";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export type LLMProvider = 'aws' | 'gemini';

export function getLLM(provider?: LLMProvider, temperature: number = 0.7): BaseChatModel {
  const selectedProvider = (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || provider || 'gemini';

  if (selectedProvider === 'gemini') {
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // Use Vertex AI when service account credentials JSON is provided
    if (credsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      let credentials: any = undefined;
      const project = process.env.GCP_PROJECT_ID || "project-dbb09cfb-c833-4508-83d";

      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        } catch (_) {}
      } else if (credsPath) {
        const resolvedPath = path.isAbsolute(credsPath)
          ? credsPath
          : path.resolve(process.cwd(), credsPath);
        try {
          credentials = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
        } catch (_) {}
      }

      if (credentials) {
        return new ChatVertexAI({
          model,
          location: process.env.GCP_LOCATION || "us-central1",
          temperature,
          authOptions: {
            projectId: credentials.project_id || project,
            credentials,
          },
        });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    return new ChatGoogleGenerativeAI({
      apiKey,
      model,
      temperature,
    });
  }

  // Default: AWS Bedrock
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
