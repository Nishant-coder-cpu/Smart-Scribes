import { NextRequest, NextResponse } from 'next/server';
import { generateResponse } from '@/lib/langchain-agent';

// Route handler for Chat API (Vertex AI / Gemini)
export async function POST(req: NextRequest) {
  try {
    const { message, lectureContent } = await req.json();
    
    const googleSearchApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    // Generate response with lecture content as context
    const response = await generateResponse(
      message,
      geminiApiKey,
      googleSearchApiKey,
      searchEngineId,
      lectureContent
    );
    
    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    const msg = error?.message || 'Failed to process request';
    return NextResponse.json(
      { error: msg, details: msg },
      { status: 500 }
    );
  }
}