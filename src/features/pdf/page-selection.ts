export function parsePages(text: string, count: number): number[] {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error('The PDF page count is invalid.');
  }
  if (!text.trim()) throw new Error('Enter at least one page number.');

  const pages: number[] = [];
  const seen = new Set<number>();
  for (const entry of text.split(',')) {
    const match = /^\s*([1-9]\d*)\s*(?:-\s*([1-9]\d*)\s*)?$/.exec(entry);
    if (!match) throw new Error('Use page numbers or ranges, such as 1, 3-5.');
    const first = Number(match[1]);
    const last = match[2] === undefined ? first : Number(match[2]);
    if (
      !Number.isSafeInteger(first) ||
      !Number.isSafeInteger(last) ||
      first > last ||
      last > count
    ) {
      throw new Error(
        `Page numbers must be between 1 and ${count}, with ranges in ascending order.`,
      );
    }
    for (let page = first; page <= last; page += 1) {
      if (seen.has(page)) throw new Error(`Page ${page} is selected more than once.`);
      seen.add(page);
      pages.push(page - 1);
    }
  }
  return pages;
}
