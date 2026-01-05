# Root Cause Analysis: Column Prefix Bug

## Bug Description
After typing `SELECT * FROM sci_buffet_quotation WHERE sc`, autocomplete shows table names and keywords instead of columns.

## Investigation Results

### What the Screenshot Shows
- SQL: `SELECT * FROM sci_buffet_quotation where sc`
- Autocomplete showing:
  - `sci_buffet_quotation` (table name) ❌ WRONG
  - `SELECT` (keyword) ❌ WRONG
- Expected: Columns from `sci_buffet_quotation` starting with `sc` ✅

### Code Analysis

**Context Detection Flow** (SqlContextDetector.ts):
1. Extract prefix: `"sc"` ✅
2. Check for alias pattern (`table.col`): No match ✅
3. Find last keyword: Should find `"WHERE"` ✅
4. Match against COLUMN_CONTEXT_KEYWORDS: `"WHERE"` is in the list ✅
5. Return COLUMN_NAME context ✅

**Completion Provider Flow** (SqlCompletionProvider.ts):
1. Receive context: Should be COLUMN_NAME
2. Switch to COLUMN_NAME case
3. Call getColumnSuggestions()
4. Return columns

### The Problem

The autocomplete showing table names + keywords indicates the context is **KEYWORD** (default case), NOT COLUMN_NAME!

**Why would context be KEYWORD?**

Only if `findLastKeyword()` returns `null` or a keyword NOT in COLUMN_CONTEXT_KEYWORDS.

### Hypothesis 1: No Space After WHERE

**Scenario**: User typed `WHERE` but autocomplete triggered before space was typed.
- Text: `"... WHEREsc"` (no space)
- Split: `["SELECT", "*", "FROM", "table", "WHEREsc"]`
- Check `"WHEREsc"` in SQL_KEYWORD_SET → NO
- Returns null → KEYWORD context

**Problem**: Trigger character `=` was added, so typing `WHERE ` followed by any char should work.

### Hypothesis 2: Trigger Character Timing Issue

**Scenario**: Monaco triggers completion BEFORE the space character is processed.
- User types: `W` `H` `E` `R` `E` ` ` `s`
- Trigger character ` ` (space) fires completion
- But text buffer still shows `"WHERE"` without the space char
- Next char `s` is typed
- Text becomes `"WHEREs"`
- Context detection sees `"WHEREs"` as last word
- Not a keyword → KEYWORD context

### Hypothesis 3: Split Logic Issue

**Scenario**: The split regex doesn't handle the prefix correctly.
- Text: `"SELECT * FROM table WHERE sc"`
- Split by `/\s+/`: `["SELECT", "*", "FROM", "table", "WHERE", "sc"]`
- Loop backwards:
  - `i=5`: `"sc"` → Not a keyword
  - `i=4`: `"WHERE"` → IS a keyword! ✅
- Should work correctly

### Hypothesis 4: Prefix is Part of Last Word

**AHA!** This might be it!

When extracting prefix at line 65:
```typescript
const prefixMatch = textBefore.match(/(\w*)$/);
const prefix = prefixMatch ? prefixMatch[1] : "";  // prefix = "sc"
```

But the prefix `"sc"` is still IN the `textBefore` string! So when we call:
```typescript
const lastKeyword = findLastKeyword(textBefore);  // includes "sc"
```

The split gives us: `["...", "WHERE", "sc"]`

This SHOULD still work because we loop backwards and find `"WHERE"` before `"sc"`.

**UNLESS** - what if the issue is case sensitivity or the keyword matching logic?

Let me check the code again...

Actually, I think I need to just add better logging and test this directly. The theoretical analysis isn't revealing the issue.

## Proposed Solution

### Option 1: Remove Prefix Before Finding Last Keyword

**Problem**: `findLastKeyword` receives text including the partial word being typed.
**Solution**: Remove the prefix before analyzing keywords.

```typescript
export function detectSqlContext(sql: string, position: number): CompletionContext {
  const textBefore = sql.slice(0, position);

  // Extract the current word/prefix being typed
  const prefixMatch = textBefore.match(/(\w*)$/);
  const prefix = prefixMatch ? prefixMatch[1] : "";

  // Remove prefix from text before finding keywords
  const textForKeywordDetection = prefix ? textBefore.slice(0, -prefix.length) : textBefore;

  // Find the last significant keyword before cursor (excluding prefix)
  const lastKeyword = findLastKeyword(textForKeywordDetection);

  // ... rest of logic
}
```

### Option 2: Fix Split to Ignore Trailing Word

Modify `findLastKeyword` to ignore the last word if it's not a keyword:

```typescript
function findLastKeyword(text: string): string | null {
  const withoutStrings = text.replace(/'[^']*'/g, "''");
  const withoutComments = withoutStrings.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

  // Split and remove trailing non-keyword word
  const words = withoutComments.trim().split(/\s+/);

  // Start from second-to-last word if last word is not a keyword
  let startIdx = words.length - 1;
  if (startIdx >= 0 && !SQL_KEYWORD_SET.has(words[startIdx].toUpperCase())) {
    startIdx--;  // Skip the partial word being typed
  }

  for (let i = startIdx; i >= 0; i--) {
    const word = words[i]?.toUpperCase();
    if (word && SQL_KEYWORD_SET.has(word)) {
      // ... reconstruct phrase logic
      return phrase;
    }
  }

  return null;
}
```

### Option 3: Better Regex to Exclude Prefix

Use a regex that stops before the final partial word:

```typescript
// Get text excluding the word currently being typed
const textWithoutPrefix = textBefore.replace(/\w*$/, '');
const lastKeyword = findLastKeyword(textWithoutPrefix);
```

## Recommended Fix

**Option 3** is cleanest - remove the prefix before finding the keyword.

### Implementation

**File**: `frontend/src/components/editor/SqlContextDetector.ts`

**Change at lines 61-74**:

```typescript
export function detectSqlContext(sql: string, position: number): CompletionContext {
  const textBefore = sql.slice(0, position);

  // Extract the current word/prefix being typed
  const prefixMatch = textBefore.match(/(\w*)$/);
  const prefix = prefixMatch ? prefixMatch[1] : "";

  // Check if we're after a dot (alias.column pattern)
  const aliasMatch = textBefore.match(/(\w+)\.\s*$/);
  if (aliasMatch) {
    // ... alias logic
  }

  // Find the last significant keyword BEFORE the current word being typed
  // Remove the prefix to avoid it interfering with keyword detection
  const textForKeywordSearch = prefix ? textBefore.slice(0, -prefix.length).trimEnd() : textBefore;
  const lastKeyword = findLastKeyword(textForKeywordSearch);

  // ... rest of logic
}
```

This ensures that when text is `"SELECT * FROM table WHERE sc"`, we search for keywords in `"SELECT * FROM table WHERE "` (without `"sc"`), which will correctly find `"WHERE"`.

## Testing

After fix:
1. Type: `SELECT * FROM sci_buffet_quotation WHERE sc`
2. Check console: Should log `[SqlContextDetector] Context: { type: 'COLUMN_NAME', lastKeyword: 'WHERE', prefix: 'sc' }`
3. Autocomplete: Should show columns, not table names

---

**Next Step**: Implement Option 3 fix
