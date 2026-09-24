# Accent Letters for PopClip

A [PopClip](https://www.popclip.app/) extension: remove the accents from the selected text, or turn
it into a URL slug.

```
Crème brûlée in São Paulo  →  Creme brulee in Sao Paulo
                           →  creme-brulee-in-sao-paulo
```

Letters Unicode cannot decompose — `ø ł đ ß æ œ þ ð` and Turkish dotless `ı` — are converted too.

No entitlements are declared, so the extension provably cannot reach the network or read files.

## Tests

PopClip's own harness, not Node — different engine, different globals:

```sh
/Applications/PopClip.app/Contents/MacOS/PopClip run Config.ts test
```

Part of [Accent Letters](https://accentletters.wiki/). MIT licensed.
