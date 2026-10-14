import { NextRequest, NextResponse } from 'next/server';
import { ChatTurn, streamResponse } from '@/lib/langchain-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGE_CHARS = 4_000;

// Route handler for the AI tutor chat. Streams the answer as plain text.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { message, lectureContent, history } = body ?? {};

  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `message must be at most ${MAX_MESSAGE_CHARS} characters` },
      { status: 400 }
    );
  }

  const safeHistory: ChatTurn[] = Array.isArray(history)
    ? history
        .filter(
          (t: any) =>
            (t?.role === 'user' || t?.role === 'assistant') && typeof t?.content === 'string'
        )
        .map((t: any) => ({ role: t.role, content: t.content.slice(0, MAX_MESSAGE_CHARS) }))
    : [];

  const chunks = streamResponse(message.trim(), {
    lectureContent: typeof lectureContent === 'string' ? lectureContent : null,
    history: safeHistory,
  });

  // Wait for the first chunk before committing to a 200 streaming response, so
  // setup failures (bad credentials, model errors) still return a JSON error.
  let first: IteratorResult<string>;
  try {
    first = await chunks.next();
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process request' }, { status: 500 });
  }

  const encoder = new TextEncoder();
  let pending: IteratorResult<string> | null = first;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = pending ?? (await chunks.next());
        pending = null;
        if (result.done) controller.close();
        else controller.enqueue(encoder.encode(result.value));
      } catch (error) {
        console.error('Chat stream failed mid-response:', error);
        controller.error(error);
      }
    },
    async cancel() {
      // Client went away: stop generating.
      await chunks.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
