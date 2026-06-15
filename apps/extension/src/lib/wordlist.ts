// A small list of short, common, easy-to-spell words used to render the recovery
// phrase. Security comes from random selection + PBKDF2 over the phrase string,
// so the list only needs to be human-friendly (it is not used as an index map).
export const WORDLIST: string[] = [
  "able", "acid", "aged", "also", "area", "army", "away", "baby", "back", "ball", "band", "bank", "base", "bath", "bear", "beat",
  "been", "beer", "bell", "belt", "bird", "blue", "boat", "body", "bone", "book", "boot", "born", "both", "bowl", "calm", "card",
  "care", "cash", "cell", "city", "clay", "club", "coal", "coat", "code", "cold", "cool", "corn", "cost", "crew", "dark", "data",
  "date", "dawn", "deal", "dear", "deep", "deer", "desk", "dial", "dirt", "dish", "dock", "door", "dose", "dove", "down", "drum",
  "dual", "duck", "dust", "duty", "each", "earn", "east", "easy", "edge", "exit", "face", "fact", "fair", "fall", "farm", "fast",
  "fear", "feed", "feel", "file", "fill", "film", "find", "fine", "fire", "fish", "five", "flag", "flat", "flow", "food", "foot",
  "fork", "form", "four", "free", "frog", "fuel", "full", "fund", "gain", "game", "gate", "gear", "gift", "girl", "give", "glad",
  "gold", "golf", "good", "gray", "grew", "grid", "grip", "gulf", "hair", "half", "hall", "hand", "hard", "harm", "hawk", "haze",
];
