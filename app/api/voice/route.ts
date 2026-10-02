import { z } from "zod";

export const maxDuration = 30;

const Body = z.object({
  text: z.string().trim().min(1).max(4000),
});

// Charlotte is ElevenLabs' warm conversational voice. ElevenLabs routes this
// legacy ID to Helen, its British replacement, for a consistent Coach voice.
const BRITISH_COACH_VOICE_ID = "XB0fDUnXU5powFXDhCwa";

export async function POST(req: Request) {
  const input = Body.safeParse(await req.json().catch(() => null));
  if (!input.success) return Response.json({ error: "A short text response is required." }, { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return Response.json({ error: "ElevenLabs voice is not configured." }, { status: 503 });

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${BRITISH_COACH_VOICE_ID}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: input.data.text,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8,
            style: 0.12,
            use_speaker_boost: true,
            speed: 1,
          },
        }),
        cache: "no-store",
      },
    );
    if (!response.ok || !response.body) {
      console.error("[voice] ElevenLabs request failed", response.status);
      return Response.json({ error: "The voice service is unavailable." }, { status: 502 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "The voice service is unavailable." }, { status: 502 });
  }
}
