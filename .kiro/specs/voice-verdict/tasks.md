# Voice Verdict — Implementation Tasks

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## Phase 1: ElevenLabs Service Layer

- [x] 1.1 Install elevenlabs npm package (`npm install elevenlabs`)
- [x] 1.2 Add `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` to .env.local.example
- [x] 1.3 Create `src/lib/elevenlabs.ts`
  - [x] 1.3.1 Implement `synthesizeVerdict(script, voiceId?)` → ReadableStream using ElevenLabs TTS stream endpoint
  - [x] 1.3.2 Implement `transcribeAudio(formData)` → string using ElevenLabs STT endpoint
  - [x] 1.3.3 Implement `buildVerdictScript(result)` → string using verdict script format from design doc
  - [x] 1.3.4 Export `DEFAULT_JUDGE_VOICE_ID` constant

## Phase 2: API Routes

- [x] 2.1 Create `src/app/api/voice/verdict/route.ts`
  - [x] 2.1.1 Parse analysis result from POST body
  - [x] 2.1.2 Call `buildVerdictScript()` then `synthesizeVerdict()`
  - [x] 2.1.3 Stream audio response with `Content-Type: audio/mpeg`
  - [x] 2.1.4 Handle missing API key (500), invalid body (422), ElevenLabs errors (502)
- [x] 2.2 Create `src/app/api/voice/transcribe/route.ts`
  - [x] 2.2.1 Parse multipart form data to extract audio file
  - [x] 2.2.2 Call `transcribeAudio(formData)` → text
  - [x] 2.2.3 Return `{ text }` JSON
  - [x] 2.2.4 Handle missing API key (500), no audio file (422), ElevenLabs errors (502)

## Phase 3: Frontend Components

- [x] 3.1 Create `src/components/voice-verdict.tsx`
  - [x] 3.1.1 "Hear Verdict" button with mic/speaker icon
  - [x] 3.1.2 Fetch POST /api/voice/verdict, receive audio blob, play via HTMLAudioElement
  - [x] 3.1.3 Waveform bars animation (5 CSS-animated bars, staggered delays)
  - [x] 3.1.4 Loading state (spinner) during synthesis
  - [x] 3.1.5 Playing state (waveform + "Playing..." label)
  - [x] 3.1.6 Error state (toast notification, button resets to idle)
  - [x] 3.1.7 Stop/replay controls
- [x] 3.2 Create `src/components/voice-input.tsx`
  - [x] 3.2.1 Render null if MediaRecorder API not available
  - [x] 3.2.2 Mic button: click to start recording (getUserMedia)
  - [x] 3.2.3 Recording state: pulsing red dot, "Stop" on click
  - [x] 3.2.4 Post-recording: send chunks to /api/voice/transcribe
  - [x] 3.2.5 Transcribing state: spinner
  - [x] 3.2.6 On success: call onTranscript(text) prop
  - [x] 3.2.7 On error: toast notification

## Phase 4: Integration

- [x] 4.1 Add `<VoiceVerdict result={result} />` to `src/app/analyze/page.tsx` results section (req 1.1)
- [x] 4.2 Add `<VoiceInput onTranscript={...} />` next to headline input in analyze page (req 2.1)
- [x] 4.3 Add `<VoiceInput onTranscript={...} />` next to brief textarea in analyze page (req 2.2)
- [x] 4.4 Add `<VoiceInput onTranscript={...} />` next to brief textarea in brief-score page (req 2.2)

## Phase 5: Polish

- [x] 5.1 Test voice verdict end-to-end with a real analysis result
- [x] 5.2 Test voice input on Chrome and Safari
- [x] 5.3 Verify audio streams correctly without full download delay
- [x] 5.4 Add error boundary around voice components so failures don't break the main UI
