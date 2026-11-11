const searchKey = value => String(value).normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/gu, "");

// Filtering never selects an option or changes a build; keep its current value reachable.
export function filterSeasonSelection(select, query) {
  const key = searchKey(query);
  let matches = 0;
  for (const option of select.options) {
    const match = !key || searchKey(option.textContent).includes(key);
    if (option.value && match) matches += 1;
    option.hidden = Boolean(option.value) && !option.selected && !match;
    option.disabled = option.hidden;
  }
  return matches;
}
