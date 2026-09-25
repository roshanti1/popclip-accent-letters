// #popclip
// name: Accent Letters
// identifier: wiki.accentletters.popclip
// description: Remove the accents from the selected text, or turn it into a URL slug.
// popclipVersion: 6221
// icon: square filled Áa
// keywords: accent accents diacritic diacritics unaccent ascii slug slugify transliterate
// requirements: [text, paste]
// after: paste-result

// Accent Letters for PopClip — https://accentletters.wiki/
//
// Two actions on a text selection: strip the accents, or make a URL slug. Both are pure string
// work. The extension declares NO entitlements, so it provably cannot reach the network or the
// filesystem: PopClip gates XMLHttpRequest behind `entitlements: [network]` and gives JavaScript
// actions no file access at all. That also means it installs with no warning dialog.
//
// The rules below are byte-for-byte the ones the Accent Letters website, apps and other add-ons
// use, because a letter must not strip one way here and another way there.

/** Letters with no canonical decomposition: NFD leaves them exactly as they are, so they need a table. */
const SPECIAL: Record<string, string> = {
  ø: "o", Ø: "O", ł: "l", Ł: "L", đ: "d", Đ: "D", ħ: "h", Ħ: "H", ı: "i", ŧ: "t", Ŧ: "T",
  ß: "ss", ẞ: "SS", æ: "ae", Æ: "AE", œ: "oe", Œ: "OE", þ: "th", Þ: "Th", ð: "d", Ð: "D",
};
const SPECIAL_RE = new RegExp(`[${Object.keys(SPECIAL).join("")}]`, "g");

/**
 * NFD, not NFKD.
 *
 * Removing accents must leave the rest of the text alone. NFKD is a *compatibility* decomposition:
 * it would also rewrite ﬁ to fi, ① to 1 and ½ to 1⁄2, which is a different operation from the one
 * the user asked for. The slug action below is the place for that kind of flattening, and even
 * there it is done explicitly rather than as a side effect of normalisation.
 *
 * The table runs AFTER the decomposition, never instead of it: ǣ decomposes to æ plus a macron,
 * and æ itself has no plain form, so it still has to become "ae".
 */
// A combining mark is not always an accent. In Devanagari the virama is a mark, so क्षत्रिय became
// कषतरय; in Thai the vowels are marks, so สวัสดี became สวสด; and ❤️ lost its variation selector.
// So a character is only touched when its decomposition starts with a LATIN letter — everything
// else is returned exactly as it came in.
const LATIN = /\p{Script=Latin}/u;

function stripChar(c: string): string {
  const d = c.normalize("NFD");
  if (!LATIN.test(d[0])) return c;
  return d.replace(/\p{M}/gu, "").replace(SPECIAL_RE, (x) => SPECIAL[x]);
}

export function removeAccents(text: string): string {
  return [...text.normalize("NFC")].map(stripChar).join("");
}

export function toSlug(text: string): string {
  return removeAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const actions = [
  {
    title: "Remove Accents",
    icon: "text:Áa",
    code: (input: Input) => removeAccents(input.text),
  },
  {
    title: "URL Slug",
    icon: "text:a-b",
    code: (input: Input) => toSlug(input.text),
  },
];

// Run with:  /Applications/PopClip.app/Contents/MacOS/PopClip run Config.ts test
// PopClip's own harness, not Node: different engine, different globals. In the harness
// popclip.input.text is empty, which is why the transforms above are plain functions of a string.
export function test(): void {
  const cases: [string, string][] = [
    ["Crème brûlée in São Paulo", "Creme brulee in Sao Paulo"],
    ["Zürich", "Zurich"],
    ["ø Ø ł Ł đ ß æ œ þ ð", "o O l L d ss ae oe th d"],
    ["Tiếng Việt", "Tieng Viet"],
    ["İstanbul ığdır", "Istanbul igdir"],
    // ǣ is the case that proves the table runs after NFD rather than instead of it.
    ["ǣ", "ae"],
    // Already-decomposed input: e + U+0301 must strip just like the composed é.
    ["é", "e"],
    // Nothing outside the Latin script may be touched.
    ["日本語 plain 🎉", "日本語 plain 🎉"],
    ["", ""],
    // A combining mark is not always an accent: these must come back untouched.
    ["क्षत्रिय", "क्षत्रिय"],
    ["สวัสดี", "สวัสดี"],
    ["❤️", "❤️"],
    ["Crème café ☕ में", "Creme cafe ☕ में"],
  ];

  let failed = 0;

  for (const [input, want] of cases) {
    const got = removeAccents(input);
    if (got !== want) {
      failed++;
      print(`FAIL  removeAccents(${JSON.stringify(input)}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    }
  }

  const slugs: [string, string][] = [
    ["Crème brûlée in São Paulo", "creme-brulee-in-sao-paulo"],
    ["  Grüße, Welt!  ", "grusse-welt"],
    ["Łódź 2026", "lodz-2026"],
    ["---", ""],
  ];

  for (const [input, want] of slugs) {
    const got = toSlug(input);
    if (got !== want) {
      failed++;
      print(`FAIL  toSlug(${JSON.stringify(input)}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    }
  }

  if (failed) {
    throw new Error(`${failed} case(s) failed`);
  }

  print(`ok  ${cases.length + slugs.length} cases`);
}
