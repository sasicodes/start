export const responseFromSse = (events: readonly Record<string, unknown>[]) => {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')));
        controller.close();
      }
    }),
    { status: 200 }
  );
};
