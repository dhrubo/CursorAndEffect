export type VoicePhase = "idle" | "listening" | "speaking";

export function replyEndsConversation(reply: string): boolean {
  return /check I heard you right/i.test(reply);
}

export function voiceStatus(phase: VoicePhase, supported: boolean): string {
  if (phase === "listening") return "Listening…";
  if (phase === "speaking") return "Speaking…";
  if (!supported) return "This browser can't listen, so type your answer. I'll still read replies aloud.";
  return "Tap the microphone and talk. I'll answer out loud.";
}

type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechAlternative; length: number };
type SpeechResultEvent = { results: ArrayLike<SpeechResult> };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechHost = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function canListen(): boolean {
  return speechRecognition() !== null;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listenOnce(handlers: {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: () => void;
}): { stop: () => void } | null {
  const Speech = speechRecognition();
  if (!Speech) return null;
  const session = new Speech();
  session.lang = "en-GB";
  session.interimResults = true;
  session.continuous = false;
  let settled = false;
  const finish = (kind: "final" | "end" | "error", text = "") => {
    if (settled) return;
    settled = true;
    if (kind === "final") handlers.onFinal(text);
    else if (kind === "error") handlers.onError();
    else handlers.onEnd();
  };
  session.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) finalText += transcript;
      else interim += transcript;
    }
    if (interim) handlers.onPartial(interim.trim());
    if (finalText.trim()) {
      finish("final", finalText.trim());
      session.stop();
    }
  };
  session.onerror = () => finish("error");
  session.onend = () => finish("end");
  try {
    session.start();
  } catch {
    return null;
  }
  return {
    stop: () => {
      settled = true;
      session.onend = null;
      session.onerror = null;
      session.stop();
    },
  };
}

// A normal conversational pace sounds less synthetic than the previous slow read-out.
export const SPEAKING_RATE = 0.96;

export type VoiceOption = { id: string; label: string; lang: string };

const ACCENTS: Record<string, string> = {
  "en-gb": "British",
  "en-us": "American",
  "en-au": "Australian",
  "en-ie": "Irish",
  "en-in": "Indian",
  "en-za": "South African",
  "en-nz": "New Zealand",
  "en-ca": "Canadian",
};

export function accentFor(lang: string): string {
  const code = lang.toLowerCase().replace("_", "-");
  return ACCENTS[code.slice(0, 5)] ?? "English";
}

export function wordRanges(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const pattern = /\S+/g;
  let match = pattern.exec(text);
  while (match) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
    match = pattern.exec(text);
  }
  return ranges;
}

export function wordAt(text: string, charIndex: number): number {
  const ranges = wordRanges(text);
  const found = ranges.findIndex((range) => charIndex < range.end);
  return found === -1 ? ranges.length - 1 : found;
}

export function estimatedWordDelays(text: string, rate = SPEAKING_RATE): number[] {
  let elapsed = 0;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const at = elapsed;
      const pause = /[,.;:?!—]$/.test(word) ? 260 : 0;
      elapsed += (110 + word.length * 55 + pause) / rate;
      return Math.round(at);
    });
}

const NO_VOICES: VoiceOption[] = [];
let cachedKey = "";
let cachedVoices: VoiceOption[] = NO_VOICES;

// Coach always speaks as a British woman, so only those voices are offered.
export function voiceSnapshot(): VoiceOption[] {
  if (!canSpeak()) return NO_VOICES;
  const voices = britishFemaleVoices(window.speechSynthesis.getVoices()).sort((a, b) => a.name.localeCompare(b.name));
  const key = voices.map((voice) => voice.voiceURI).join("|");
  if (key !== cachedKey) {
    cachedKey = key;
    cachedVoices = voices.map((voice) => ({
      id: voice.voiceURI,
      label: `${accentFor(voice.lang)} · ${voice.name}`,
      lang: voice.lang,
    }));
  }
  return cachedVoices;
}

export function serverVoiceSnapshot(): VoiceOption[] {
  return NO_VOICES;
}

export function subscribeVoices(onChange: () => void): () => void {
  if (!canSpeak()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  window.speechSynthesis.getVoices();
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

export function defaultVoiceId(voices: VoiceOption[]): string {
  return [...voices].sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a))[0]?.id ?? "";
}

// British female voices shipped by Chrome, Safari/macOS and Edge/Windows.
const FEMALE_NAMES = /\b(female|serena|kate|stephanie|martha|libby|sonia|maisie|hollie|bella|abbi|olivia|mia|hazel|susan|shelley|sandy|flo)\b/;
const MALE_NAMES = /\b(male|daniel|arthur|oliver|george|ryan|thomas|alfie|elliot|ethan|noah|malcolm|eddy|reed|rocko|grandpa)\b/;

function isBritish(lang: string): boolean {
  return lang.toLowerCase().replace("_", "-") === "en-gb";
}

function voiceQualityScore(voice: Pick<VoiceOption, "id" | "label" | "lang">): number {
  const name = `${voice.label} ${voice.id}`.toLowerCase();
  let score = isBritish(voice.lang) ? 1000 : 0;
  if (FEMALE_NAMES.test(name)) score += 200;
  if (MALE_NAMES.test(name)) score -= 500;
  if (/(enhanced|premium|neural|natural|online)/.test(name)) score += 100;
  if (/(compact|espeak|novelty|grandma)/.test(name)) score -= 100;
  return score;
}

function isBritishFemale(voice: SpeechSynthesisVoice): boolean {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  return isBritish(voice.lang) && FEMALE_NAMES.test(name) && !MALE_NAMES.test(name);
}

// Falls back to any British voice that isn't known to be male when a device has no named female one.
function britishFemaleVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const female = voices.filter(isBritishFemale);
  if (female.length > 0) return female;
  return voices.filter((voice) => isBritish(voice.lang) && !MALE_NAMES.test(`${voice.name} ${voice.voiceURI}`.toLowerCase()));
}

export function preferredBritishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return britishFemaleVoices(voices).sort((a, b) => {
    const aScore = voiceQualityScore({ id: a.voiceURI, label: a.name, lang: a.lang });
    const bScore = voiceQualityScore({ id: b.voiceURI, label: b.name, lang: b.lang });
    return bScore - aScore;
  })[0];
}

export function speak(
  text: string,
  options: { voiceId?: string; rate?: number; onWord?: (index: number) => void; onEnd: () => void },
): { cancel: () => void } | null {
  if (!canSpeak()) return null;
  try {
    return speakNow(text, options);
  } catch {
    return null;
  }
}

function speakNow(
  text: string,
  { voiceId, rate = SPEAKING_RATE, onWord, onEnd }: { voiceId?: string; rate?: number; onWord?: (index: number) => void; onEnd: () => void },
): { cancel: () => void } {
  const synth = window.speechSynthesis;
  const busy = synth.speaking || synth.pending;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  // A saved choice is honoured only if it is still a British female voice.
  const chosen = voices.find((item) => item.voiceURI === voiceId);
  const voice = chosen && britishFemaleVoices(voices).includes(chosen) ? chosen : preferredBritishVoice(voices);
  if (voice) utterance.voice = voice;
  utterance.lang = "en-GB";
  utterance.rate = rate;
  let settled = false;
  let heardBoundary = false;
  let backup = 0;
  let starter = 0;
  const timers: number[] = [];
  const clearTimers = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.length = 0;
  };
  const finish = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(backup);
    window.clearTimeout(starter);
    clearTimers();
    onEnd();
  };
  utterance.onstart = () => {
    onWord?.(0);
    estimatedWordDelays(text, rate).forEach((delay, index) => {
      timers.push(
        window.setTimeout(() => {
          if (!heardBoundary && !settled) onWord?.(index);
        }, delay),
      );
    });
  };
  utterance.onboundary = (event) => {
    if (event.name && event.name !== "word") return;
    heardBoundary = true;
    clearTimers();
    onWord?.(wordAt(text, event.charIndex));
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  const lastDelay = estimatedWordDelays(text, rate).at(-1) ?? 0;
  backup = window.setTimeout(finish, Math.min(45000, lastDelay + 4000));
  const start = () => {
    synth.resume();
    synth.speak(utterance);
  };
  if (busy) starter = window.setTimeout(start, 80);
  else start();
  return {
    cancel: () => {
      settled = true;
      window.clearTimeout(backup);
      window.clearTimeout(starter);
      clearTimers();
      utterance.onend = null;
      utterance.onerror = null;
      synth.cancel();
    },
  };
}

function speechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const host = window as SpeechHost;
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}
