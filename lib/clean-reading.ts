// Readings are shown and read aloud by the witches, so drop the stage directions
// ("*leans forward*") and markdown the model sometimes adds anyway.
export function cleanReading(text: string): string {
  return text
    .replace(/\*[^*\n]+\*/g, " ") // *stage directions*
    .replace(/\([^()\n]*(?:smile|lean|whisper|gesture|wink|laugh|sigh|pause)[^()\n]*\)/gi, " ")
    .replace(/[*_#`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
