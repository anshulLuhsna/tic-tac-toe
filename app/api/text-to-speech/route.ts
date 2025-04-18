import { NextRequest, NextResponse } from 'next/server';
import { Voice, VoiceSettings } from 'elevenlabs/api';

// Replace with your actual ElevenLabs API key
// In production, use environment variables
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

// Default voice ID (you can change this to any voice from your ElevenLabs account)
// 'Adam' voice ID - Replace with your preferred voice
const DEFAULT_VOICE_ID = '0XFedAzBKNQzmTSYR1LE';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId = DEFAULT_VOICE_ID } = body;

    if (!text) {
      return new NextResponse(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ElevenLabs API error:', errorData);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to generate speech' }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();

    // Return the audio data
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 