import type { LiveFeedStreamEvent } from "@/modules/live-feed/contracts";
import { getLiveFeedHub } from "@/modules/live-feed/hub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeEvent(event: LiveFeedStreamEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(req: Request) {
  const hub = getLiveFeedHub();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      controller.enqueue(encoder.encode("retry: 5000\n\n"));

      const keepAlive = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }
      }, 15_000);

      if (typeof keepAlive.unref === "function") {
        keepAlive.unref();
      }

      const unsubscribe = await hub.subscribe((event) => {
        if (!closed) {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        }
      });

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        unsubscribe();
        controller.close();
      };

      req.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      // Cleanup happens from the abort handler above.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
