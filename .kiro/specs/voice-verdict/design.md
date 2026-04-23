# Voice Verdict — Technical Design

## Overview

Voice Verdict adds two ElevenLabs-powered capabilities to Adjudge:
1. **TTS Verdict Playback** — synthesize a voiced verdict after analysis
2. **STT Voice Input** — transcribe spoken briefs/headlines into text fields

## Architecture

```
Browser
  ├── VoiceVerdict component     → POST /api/voice/verdict  → ElevenLabs TTS API
  └── VoiceInput component       → POST /api/voice/transcribe → ElevenLabs STT API
```

All ElevenLabs API calls happen server-side. The browser never touches the API key.

## ElevenLabs Service (src/lib/elevenlabs.ts)

```typescript
// TTS: convert verdict script to audio stream
export async function synthesizeVerdict(
  script: string,
  voiceId?: string
): Promise<ReadableStream>

// STT: transcribe audio blob to text
export async function transcribeAudio(
  audioBlob: Blob
): Promise<string>

// Build verdict script from analysis result
export function buildVerdictScript(result: AnalysisResult): string
```

### TTS Implementation

Uses ElevenLabs `/v1/text-to-speech/{voice_id}/stream` endpoint:
- Model: `eleven_turbo_v2_5` (lowest latency for real-time streaming)
- Voice: `pNInz6obpgDQGcFmaJgB` (Adam — deep, authoritative) or `ELEVENLABS_VOICE_ID` env override
- Output format: `mp3_44100_128`
- Stability: 0.5, Similarity boost: 0.75

### STT Implementation

Uses ElevenLabs `/v1/speech-to-text` endpoint:
- Accepts: webm, mp4, wav, ogg (whatever MediaRecorder produces)
- Returns: transcription text

## Verdict Script Format

```
[Score announcement]
"This ad scores [N] out of 100 for originality. Verdict: [LABEL]."

[Key finding — most significant evidence]
"[Finding description based on top evidence match]"

[Judgment — tier-dependent closing line]
HIGHLY ORIGINAL (85+): "This is genuinely original work. Present it with confidence."
ORIGINAL (65–84):      "Solid original work with room to push further."
DERIVATIVE (40–64):    "This creative territory has been explored before. Dig deeper."
HIGHLY DERIVATIVE (<40): "This ad has been made before. The judge finds: derivative."
```

**Example output (73/100 ORIGINAL):**
> "This ad scores 73 out of 100 for originality. Verdict: Original. The concept dimension shows strong differentiation — no prior ad in our corpus uses this structural approach for the category. The language, however, echoes familiar territory. Solid original work with room to push further."

Target length: 60–100 words (~15–25 seconds at natural speaking pace).

## API Routes

### POST /api/voice/verdict

**Request body:**
```json
{
  "score": 73,
  "verdict": "ORIGINAL",
  "dimensions": { "concept": {...}, "language": {...}, ... },
  "similar_ads": [...]
}
```

**Response:** `audio/mpeg` stream (chunked transfer encoding)

**Implementation:**
1. Build verdict script from result using `buildVerdictScript()`
2. Call `synthesizeVerdict(script)` → ElevenLabs TTS stream
3. Pipe stream directly to response

### POST /api/voice/transcribe

**Request:** `multipart/form-data` with `audio` file field

**Response:**
```json
{ "text": "transcribed headline or brief text" }
```

**Implementation:**
1. Extract audio blob from multipart request
2. Call `transcribeAudio(blob)` → ElevenLabs STT
3. Return `{ text }`

## Frontend Components

### VoiceVerdict (src/components/voice-verdict.tsx)

```
Props: { result: AnalysisResult }

State:
  - status: 'idle' | 'loading' | 'playing' | 'error'
  - audioUrl: string | null

Behavior:
  - "Hear Verdict" button (idle state)
  - On click: fetch POST /api/voice/verdict with result JSON
  - Receive audio blob, create object URL, play via <audio>
  - Show waveform bars animation while audio.paused === false
  - On error: toast + reset to idle
```

### VoiceInput (src/components/voice-input.tsx)

```
Props: { onTranscript: (text: string) => void }

State:
  - recording: boolean
  - mediaRecorder: MediaRecorder | null

Behavior:
  - Render null if !navigator.mediaDevices (unsupported browser)
  - On click (recording=false): getUserMedia → MediaRecorder.start()
  - On click (recording=true): MediaRecorder.stop() → collect chunks → POST /api/voice/transcribe
  - On transcript: call onTranscript(text)
  - Visual: mic icon (idle), pulsing red dot (recording), spinner (transcribing)
```

## Waveform Animation

Pure CSS animation — no audio analysis library needed:

```css
/* 5 bars, staggered animation delays */
.bar { animation: pulse 1.2s ease-in-out infinite; }
.bar:nth-child(2) { animation-delay: 0.2s; }
/* etc. */
```

Bars animate up/down while audio is playing, freeze when paused.

## Environment Variables

```
ELEVENLABS_API_KEY=sk-...     # Required for TTS + STT
ELEVENLABS_VOICE_ID=...       # Optional: override default judge voice
```
