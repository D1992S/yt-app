export const LOCAL_STUB_LLM_RESPONSE =
  '[STUB] Tryb fake jest aktywny. Zwracam deterministyczną odpowiedź testową bez użycia kluczy API.';

export const buildLocalStubText = (question?: string): string => {
  const normalizedQuestion = (question || '').trim();
  if (!normalizedQuestion) {
    return LOCAL_STUB_LLM_RESPONSE;
  }

  return `${LOCAL_STUB_LLM_RESPONSE}\nPytanie: ${normalizedQuestion}`;
};
