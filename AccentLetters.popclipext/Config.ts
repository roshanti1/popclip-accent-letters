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
const LATIN = /\p{Script=Latin}/u;
const MARK = /\p{M}/u;

/**
 * Strips one cluster: a base character plus every combining mark that follows it.
 *
 * Clusters rather than code points, because two things go wrong otherwise:
 *
 *  - `a\u0301\u0323` normalises to `ạ` plus a SEPARATE acute, since no single code point carries
 *    both marks. Per-code-point stripping turned `ạ` into "a" and left the acute stranded.
 *  - A combining mark is not always an accent: the Devanagari virama, Thai vowels, Arabic harakat
 *    and an emoji variation selector are all marks. Only a LATIN base is ever stripped.
 *
 * NFD, not NFKD: a compatibility decomposition would also rewrite ﬁ to fi and ½ to 1⁄2.
 * The table runs AFTER the decomposition: ǣ decomposes to æ plus a macron, and æ has no plain form.
 */
function stripCluster(base: string, marks: string): string {
  if (!LATIN.test(base)) return base + marks;
  return (base + marks).normalize("NFD").replace(/\p{M}/gu, "").replace(SPECIAL_RE, (x) => SPECIAL[x]);
}

/**
 * The ORIGINAL text is walked, with no normalisation first, because anything this function does
 * not strip has to come back byte for byte. Normalising to NFC up front rewrote text it then left
 * alone: decomposed Cyrillic и + breve came back as й, and decomposed Hangul jamo were composed
 * into 한 — the text was changed while the caller was told nothing had changed.
 *
 * Normalising to NFD up front is worse: it splits a Hangul syllable into jamo, which are letters
 * rather than marks, so the walk handed 한 back as three separate characters.
 *
 * Normalisation belongs in stripCluster instead, applied to the one cluster being stripped — which
 * is what makes decomposed and precomposed Latin give the same answer.
 */
export function removeAccents(text: string): string {
  const src = text;
  let out = "";
  let i = 0;

  while (i < src.length) {
    const base = String.fromCodePoint(src.codePointAt(i)!);
    i += base.length;

    let marks = "";
    while (i < src.length) {
      const c = String.fromCodePoint(src.codePointAt(i)!);
      if (!MARK.test(c)) break;
      marks += c;
      i += c.length;
    }
    out += stripCluster(base, marks);
  }
  return out;
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
    // BEGIN generated from test/accent-conformance.json — node popclip/build-tests.mjs
    // the ordinary case: precomposed Latin letters with one mark each
    ["Crème brûlée in São Paulo", "Creme brulee in Sao Paulo"],
    // Vietnamese stacks two marks on one letter
    ["Tiếng Việt", "Tieng Viet"],
    // Turkish dotted I and dotless i, which are different letters rather than accents
    ["İstanbul ığdır", "Istanbul igdir"],
    // the table must run AFTER the decomposition: æ plus macron decomposes to æ, which still has no plain form
    ["ǣ", "ae"],
    // letters NFD does not touch at all, so a table is the only thing that converts them
    ["ø Ø ł Ł đ Đ ħ Ħ ı ŧ Ŧ ß æ œ þ ð", "o O l L d D h H i t T ss ae oe th d"],
    // text that arrives already decomposed
    ["e\u0301", "e"],
    // TWO marks NFC cannot combine into one code point: it gives ạ plus a stranded acute. A per-code-point stripper returned á here — still accented. Found by review on raycast/extensions#31531.
    ["a\u0301\u0323", "a"],
    // the same trap with ogonek and acute
    ["o\u0328\u0301", "o"],
    // the Devanagari virama is a combining mark but not an accent. Deleting marks by category turned this into कषतरय, a different word. Found by review on raycast/extensions#31531.
    ["क\u094Dषत\u094Dर\u093Fय", "क\u094Dषत\u094Dर\u093Fय"],
    // Thai vowels are combining marks and carry the meaning; stripping them gave สวสด
    ["สว\u0E31สด\u0E35", "สว\u0E31สด\u0E35"],
    // Arabic harakat are marks too
    ["م\u064Eرےح\u064Eب\u064Bا", "م\u064Eرےح\u064Eب\u064Bا"],
    // Hebrew niqqud and the shin dot
    ["ש\u05B8\u05C1לו\u05B9ם", "ש\u05B8\u05C1לו\u05B9ם"],
    // U+FE0F is a mark by category, so a red heart came back as a black outline
    ["❤\uFE0F", "❤\uFE0F"],
    // NFD splits a Hangul syllable into jamo, which are LETTERS, not marks: walking the decomposed form returned six characters.
    ["한국어", "한국어"],
    // DECOMPOSED Cyrillic must come back decomposed. Normalising the whole string to NFC before deciding what is Latin composed this to й — the text was rewritten while the command reported nothing changed. Found by review on raycast/extensions#31531.
    ["и\u0306", "и\u0306"],
    // the same trap with decomposed Hangul jamo, which an up-front NFC composed into 한
    ["한", "한"],
    // decomposed Greek and Cyrillic together: nothing this function does not strip may be re-spelled
    ["α\u0301 е\u0308", "α\u0301 е\u0308"],
    // the other half of that rule: Latin IS normalised, so decomposed and precomposed input give one answer
    ["e\u0301 café", "e cafe"],
    // Greek must come back composed, byte for byte, not merely looking the same
    ["Ελληνικά", "Ελληνικά"],
    // Cyrillic й decomposes to и plus a breve, so a script guard is the only thing saving it
    ["Привет", "Привет"],
    // NFD, never NFKD: a compatibility decomposition would rewrite these to 1⁄3, fi and 5
    ["½ ﬁ ⁵", "½ ﬁ ⁵"],
    // mixed scripts in one string: the Latin words strip and the Devanagari beside them does not
    ["Crème café ☕ म\u0947\u0902", "Creme cafe ☕ म\u0947\u0902"],
    // empty input
    ["", ""],
    // unchanged input must be returned unchanged, so callers can skip a pointless undo step
    ["no accents here", "no accents here"],
    // END generated
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
