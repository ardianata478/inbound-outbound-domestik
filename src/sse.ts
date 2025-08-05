import { EventSource } from 'eventsource';

type SSECallback<T> = (data: T) => void;

export function subscribeSSE<T = any>({
  url,
  event,
  onMessage,
  onError,
}: {
  url: string;
  event: string;
  onMessage: SSECallback<T>;
  onError?: (err: any) => void;
}): () => void {
  const es = new EventSource(url);

  const handler = (e: MessageEvent) => {
    try {
      console.log(e);

      const parsed = JSON.parse(e.data);
      onMessage(parsed);
    } catch {
      console.error('Failed to parse SSE message:', e.data);
    }
  };

  es.addEventListener(event, handler as any);

  es.onerror = (err) => {
    console.error('SSE connection error:', err);
    onError?.(err);
    es.close();
  };

  return () => {
    es.removeEventListener(event, handler as any);
    es.close();
  };
}

subscribeSSE({
  url: 'http://localhost:42069/sse',
  event: 'main',
  onMessage: (data) => {
    console.log('Received:', data);
  },
  onError: (err) => {
    console.error('SSE Error:', err);
  },
});
