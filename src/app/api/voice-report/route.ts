import { NextResponse } from "next/server";

/**
 * Converts the voice script to speech using ElevenLabs TTS API.
 * Uses the same voice as the coaching session for consistency.
 */
export async function POST(request: Request) {
  try {
    const { text, voiceId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    // Use the provided voiceId or default to "Serena" (calm, therapeutic)
    // Serena's voice ID — you may need to look this up in ElevenLabs Voice Library
    // If using a custom or different voice, update this default
    const selectedVoice = voiceId || "RGb96Dcl0k5eVje8EBch";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5", // Low latency model
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errorText);
      return NextResponse.json(
        { error: "Voice generation failed" },
        { status: 500 }
      );
    }

    // Stream the audio back
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Voice report error:", error);
    return NextResponse.json(
      { error: "Voice generation failed" },
      { status: 500 }
    );
  }
}
