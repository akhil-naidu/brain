export function canUseSpeechSynthesis(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function speakText(
  text: string,
  options?: { onEnd?: () => void; onError?: () => void },
): { stop: () => void } | null {
  if (!canUseSpeechSynthesis()) {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(trimmed);
  if (options?.onEnd) {
    utterance.addEventListener("end", options.onEnd, { once: true });
  }
  if (options?.onError) {
    utterance.addEventListener("error", options.onError, { once: true });
  }

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => {
      window.speechSynthesis.cancel();
    },
  };
}
