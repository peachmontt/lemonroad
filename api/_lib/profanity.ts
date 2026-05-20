/**
 * Minimal profanity filter for display names.
 * Checks against a short English blocklist + catches simple l33t substitutions.
 */

const BLOCKLIST = [
  'fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'fag',
  'bitch', 'asshole', 'ass', 'cock', 'dick', 'pussy', 'whore',
  'slut', 'retard', 'kike', 'spic', 'chink', 'wetback', 'tranny',
  'rape', 'pedo', 'nazi',
];

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a',
  '$': 's', '!': 'i', '+': 't',
};

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[013457@$!+]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, '');
}

export function hasProfanity(name: string): boolean {
  const clean = normalize(name);
  return BLOCKLIST.some((word) => clean.includes(word));
}

export function assertCleanName(name: string): string | null {
  return hasProfanity(name) ? 'Display name contains prohibited content' : null;
}
