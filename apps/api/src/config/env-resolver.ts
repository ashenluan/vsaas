export function resolveLlmApiKey(env: Record<string, string | undefined>): string | undefined {
  return env.LLM_API_KEY?.trim() || env.DASHSCOPE_API_KEY?.trim() || undefined;
}

export function resolveGoogleImagenKey(env: Record<string, string | undefined>): string | undefined {
  return env.GOOGLE_IMAGEN_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim() || undefined;
}
