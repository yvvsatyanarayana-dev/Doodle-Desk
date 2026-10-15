const SEARCHABLE_FIELDS = ['text', 'name', 'link'];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createMatcher(query, caseSensitive) {
  return new RegExp(escapeRegExp(query), caseSensitive ? 'g' : 'gi');
}

export function findBoardMatches(elements, query, { caseSensitive = false } = {}) {
  const needle = String(query ?? '').trim();
  if (!needle) return [];

  const matcher = createMatcher(needle, caseSensitive);
  const matches = [];
  for (const element of elements || []) {
    if (element.isDeleted || element.isHidden) continue;
    for (const field of SEARCHABLE_FIELDS) {
      const value = element[field];
      if (typeof value !== 'string') continue;
      matcher.lastIndex = 0;
      const occurrences = value.match(matcher)?.length || 0;
      if (occurrences) {
        matches.push({
          elementId: element.id,
          field,
          value,
          occurrences,
          elementType: element.type,
        });
      }
    }
  }
  return matches;
}

function replaceValue(value, query, replacement, caseSensitive) {
  if (caseSensitive) {
    const occurrences = value.split(query).length - 1;
    return { value: value.split(query).join(replacement), occurrences };
  }

  const matcher = createMatcher(query, false);
  let occurrences = 0;
  const updated = value.replace(matcher, () => {
    occurrences += 1;
    return replacement;
  });
  return { value: updated, occurrences };
}

export function replaceBoardMatches(elements, query, replacement = '', { caseSensitive = false } = {}) {
  const needle = String(query ?? '').trim();
  const insertedText = String(replacement ?? '');
  if (!needle) return { elements, replacements: 0 };

  let replacements = 0;
  const updatedElements = (elements || []).map((element) => {
    if (element.isDeleted || element.isHidden) return element;

    let changed = false;
    const patch = {};
    for (const field of SEARCHABLE_FIELDS) {
      const value = element[field];
      if (typeof value !== 'string') continue;
      const result = replaceValue(value, needle, insertedText, caseSensitive);
      if (result.occurrences) {
        patch[field] = result.value;
        replacements += result.occurrences;
        changed = true;
      }
    }

    return changed
      ? {
        ...element,
        ...patch,
        version: (element.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 100000),
        updated: Date.now(),
      }
      : element;
  });

  return { elements: updatedElements, replacements };
}

export function replaceBoardMatch(elements, match, query, replacement = '', { caseSensitive = false } = {}) {
  const needle = String(query ?? '').trim();
  const insertedText = String(replacement ?? '');
  if (!needle || !match?.elementId || !SEARCHABLE_FIELDS.includes(match.field)) {
    return { elements, replacements: 0 };
  }

  let replacements = 0;
  const updatedElements = (elements || []).map((element) => {
    if (element.id !== match.elementId || element.isDeleted || element.isHidden) return element;
    const value = element[match.field];
    if (typeof value !== 'string') return element;

    let updatedValue = value;
    if (caseSensitive) {
      const index = value.indexOf(needle);
      if (index >= 0) {
        updatedValue = `${value.slice(0, index)}${insertedText}${value.slice(index + needle.length)}`;
        replacements = 1;
      }
    } else {
      const matcher = createMatcher(needle, false);
      updatedValue = value.replace(matcher, (found) => {
        if (replacements) return found;
        replacements = 1;
        return insertedText;
      });
    }

    if (!replacements) return element;
    return {
      ...element,
      [match.field]: updatedValue,
      version: (element.version || 1) + 1,
      versionNonce: Math.floor(Math.random() * 100000),
      updated: Date.now(),
    };
  });

  return { elements: updatedElements, replacements };
}
