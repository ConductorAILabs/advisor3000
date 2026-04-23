# Voice Verdict — Requirements

## Introduction

Voice Verdict adds ElevenLabs-powered audio to Adjudge's analysis workflow. A dramatic AI judge voice reads originality verdicts aloud, and voice input lets users dictate briefs and headlines instead of typing.

## Requirements

### 1. Voiced Originality Verdict

**User Story:** As a creative director reviewing analysis results, I want to hear the verdict read aloud by an authoritative judge voice, so that the score lands with emotional weight and I can share the moment in presentations.

**Acceptance Criteria:**
- 1.1: A "Hear Verdict" button appears on the analysis results page after scoring is complete
- 1.2: Clicking the button calls ElevenLabs TTS to synthesize a voiced verdict script
- 1.3: The verdict script includes: overall score, verdict label, the most compelling piece of evidence from the top-scoring dimension match, and a closing judgment line
- 1.4: Audio plays directly in the browser without requiring a download
- 1.5: A waveform animation plays while audio is streaming
- 1.6: The voice used is a deep, authoritative judge/announcer voice (ElevenLabs voice ID configurable via env var)
- 1.7: The button shows a loading state while synthesis is in progress
- 1.8: If synthesis fails, an error toast is shown and the button resets

### 2. Voice Input for Briefs and Headlines

**User Story:** As a copywriter testing headlines, I want to speak my headline or brief instead of typing it, so that I can quickly test ideas without switching contexts.

**Acceptance Criteria:**
- 2.1: A microphone button appears next to the headline input field on the analyze page
- 2.2: A microphone button appears next to the brief textarea on the analyze and brief-score pages
- 2.3: Clicking the microphone button requests browser microphone permission and begins recording
- 2.4: While recording, the button pulses red and shows a "Stop" indicator
- 2.5: Stopping recording sends the audio to POST /api/voice/transcribe
- 2.6: The transcribed text is populated into the corresponding input field
- 2.7: If the browser does not support MediaRecorder, the microphone button is hidden
- 2.8: If transcription fails, an error toast is shown and the field is unchanged

### 3. Verdict Script Generation

**User Story:** As a developer, I want a consistent, well-structured verdict script format for TTS, so that the voiced output always sounds natural and impactful.

**Acceptance Criteria:**
- 3.1: The verdict script is generated server-side from the analysis result JSON
- 3.2: Scripts follow a three-part structure: (1) Score announcement, (2) Key finding, (3) Judgment
- 3.3: Score announcement includes the numeric score and verdict label
- 3.4: Key finding cites the most significant evidence match found
- 3.5: Judgment closes with a memorable line appropriate to the verdict tier
- 3.6: Script length targets 15–25 seconds of audio (approximately 60–100 words)

### 4. API Routes

**User Story:** As a developer, I want clean API routes for voice operations, so that frontend components have a consistent interface regardless of ElevenLabs API changes.

**Acceptance Criteria:**
- 4.1: POST /api/voice/verdict accepts analysis result JSON, returns audio stream
- 4.2: POST /api/voice/transcribe accepts multipart audio blob, returns { text: string }
- 4.3: Both routes return appropriate HTTP error codes (401, 422, 500) with message bodies
- 4.4: ELEVENLABS_API_KEY is never exposed to the client
