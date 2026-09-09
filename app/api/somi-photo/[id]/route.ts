const photos: Record<string, string> = {
  "1": "https://raw.githubusercontent.com/dgriego/somi/5281467a2a418a8541121258b30881071707e22b/public/somi-first-1.webp",
  "2": "https://raw.githubusercontent.com/dgriego/somi/5281467a2a418a8541121258b30881071707e22b/public/somi-first-2.webp",
  "3": "https://raw.githubusercontent.com/dgriego/somi/5281467a2a418a8541121258b30881071707e22b/public/somi-first-3.webp",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const source = photos[id];
  if (!source) return new Response("Photo not found", { status: 404 });

  try {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) return new Response("Photo unavailable", { status: 502 });
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Photo unavailable", { status: 502 });
  }
}
