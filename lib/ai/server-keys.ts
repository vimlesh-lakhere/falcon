export function getServerOpenAiKey(): string | undefined {
  return process.env.OPENAI_API_KEY || undefined;
}

export function getServerGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || undefined;
}

export function getServerAiKey(): string | undefined {
  return getServerOpenAiKey() || getServerGeminiKey();
}
