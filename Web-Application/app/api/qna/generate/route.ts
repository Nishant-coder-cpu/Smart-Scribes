import { NextRequest, NextResponse } from 'next/server';
import { generateQnA, QuestionFormat } from '@/lib/qna-generator';

const FORMATS: QuestionFormat[] = ['mcq', 'subjective', 'mathematical'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, questionFormat, lectureContent, useWebSearch } = body;

    // Validate input
    if (!topic || typeof topic !== 'string' || topic.length > 200) {
      return NextResponse.json(
        { error: 'Topic is required (max 200 characters)' },
        { status: 400 }
      );
    }

    if (!FORMATS.includes(questionFormat)) {
      return NextResponse.json(
        { error: 'Valid question format is required (mcq, subjective, or mathematical)' },
        { status: 400 }
      );
    }

    // Generate questions and answers via LLM
    const questions = await generateQnA(topic.trim(), questionFormat, {
      lectureContent: typeof lectureContent === 'string' ? lectureContent : null,
      useWebSearch: useWebSearch !== false,
    });

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions could be generated for this topic' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      questions,
      success: true,
      topic,
      format: questionFormat
    });

  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
