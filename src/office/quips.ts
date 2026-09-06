/**
 * NPC quips for the office simulation. 12 lines per character, deterministic
 * via pickQuip (seed % list.length). Lines fit speech bubbles under 70 chars.
 * Tone: satirical banker, references to finance concepts as jokes, never
 * mean-spirited, no profanity, no real firms.
 */

export const QUIPS: Record<string, string[]> = {
  md: [
    'pls fix.',
    'Why is this not on my desk yet?',
    'Is it bonus season? No. Get back to work.',
    'I read your model. I have notes. All of them.',
    'Your DCF assumes growth. Why?',
    'That comp set is fiction. Actual fiction.',
    'Comps are not hope. Comps are the market. Try again.',
    'Working capital. Ever heard of it?',
    'EBITDA is not revenue. Let me know when you learn.',
    'I have been here since 2am. Your footnotes are still wrong.',
    'LBO math does not work. Start over.',
    'That EV/EBITDA multiple. Defend it. Now.',
  ],
  hr: [
    'Remember: we are a family here.',
    'Your performance review is... scheduled.',
    'Have you done the compliance training?',
    'Wellness is our priority. Mandatory Thursday yoga.',
    'Team lunch next week! We are all in this together.',
    'Did you review the updated handbook? Quiz coming.',
    'Remember to hydrate. Culture starts with YOU.',
    'Our values matter: integrity, teamwork, compliance.',
    'Open door policy. I am always here to listen.',
    'Anonymous survey time! Feedback shapes our culture.',
    'Let us celebrate wins: nobody got sued this quarter.',
    'We hire for culture fit first. Skills second.',
  ],
  analystA: [
    'Third all-nighter this week. Living the dream.',
    'The MD wants it in 12-point Garamond now.',
    'Have you seen the printer? It hates me.',
    'Excel crashed. I lost two hours of work.',
    'Page 47 logos still do not align. Kill me.',
    'Can you review my pitch book deck? I am terrified.',
    'MD red-lined everything. Literally everything.',
    'Another all-nighter means another coffee IV.',
    'First-year analyst. First year of sleep deprivation.',
    'Formatting takes longer than the actual analysis.',
    'Why do fonts matter more than the model?',
    'I want to learn. I also want to sleep. Pick one.',
  ],
  analystB: [
    'Did you align the logos on page 47?',
    'EBITDA is just a vibe, honestly.',
    'Coffee machine is out again.',
    'Printer paper jam. Do not touch mine, I swear.',
    'The MD is very confident. About being wrong.',
    'Comps are fake, but so is our business case.',
    'Working capital? That is just money they forgot.',
    'EV is whatever number fits the narrative.',
    'LBO math: assume hockey stick, pray it works.',
    'Second year. Still no idea what I am doing.',
    'This model will close the deal. Or blow up.',
    'Bonus season: when we learn we earn less than interns.',
  ],
  associate: [
    'The client wants a football field by 9am.',
    'Never trust a peer set you did not pick.',
    'VP says "circle back". Again.',
    'Client just moved the deadline up six hours.',
    'Football field analysis: 47 scenarios, same answer.',
    'DCF, comps, precedent—pick the highest one.',
    'The client wants sensitivity. To everything.',
    'EBITDA? This client does not have EBITDA.',
    'Working capital shock. Nobody budgeted for this.',
    'LBO sponsor just called. Numbers too high. Redo it.',
    'VP wants to "circle back" on deck structure.',
    'Deal flow never stops. Neither do I apparently.',
  ],
}

/**
 * Pick a quip deterministically by character and seed.
 * seed % list.length ensures stable, repeatable selection.
 * Falls back to '...' if character not found.
 */
export function pickQuip(npc: string, seed: number): string {
  const quips = QUIPS[npc] ?? ['...']
  return quips[seed % quips.length]
}
