# Accent Letters

Two actions on a text selection.

**Remove Accents** — `Crème brûlée in São Paulo` becomes `Creme brulee in Sao Paulo`. It also
converts the letters Unicode cannot decompose, which a plain `normalize()` silently leaves alone:
`ø ł đ ß æ œ þ ð` and Turkish dotless `ı`.

**URL Slug** — the same text as `creme-brulee-in-sao-paulo`.

Both are pure string work. The extension declares no entitlements, so it cannot reach the network
or the filesystem — PopClip gates those behind entitlements it does not ask for.

The rules are shared with the [Accent Letters](https://accentletters.wiki/) website and its other
add-ons, so a letter cannot strip one way here and another way there.
