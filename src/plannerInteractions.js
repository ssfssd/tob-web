export function updateSelection(currentIds, itemId, maxSelections) {
  const ids = currentIds.filter(Boolean);

  if (ids.includes(itemId)) {
    return {
      ids: ids.filter((selectedId) => selectedId !== itemId),
      status: "removed",
    };
  }

  if (maxSelections === 1) {
    return { ids: [itemId], status: "added" };
  }

  if (ids.length >= maxSelections) {
    return { ids, status: "limit" };
  }

  return { ids: [...ids, itemId], status: "added" };
}

export function paginateItems(items, limit) {
  const pageSize = Math.max(1, Math.floor(Number(limit) || 1));

  return {
    items: items.slice(0, pageSize),
    total: items.length,
    hasMore: items.length > pageSize,
  };
}

export function scrollSelectorPage(scroller, direction) {
  const clientHeight = Number(scroller?.clientHeight) || 0;
  const scrollHeight = Number(scroller?.scrollHeight) || 0;
  if (clientHeight <= 0 || scrollHeight <= clientHeight) return false;

  const maxScrollTop = scrollHeight - clientHeight;
  const currentScrollTop = Number(scroller.scrollTop) || 0;
  scroller.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, currentScrollTop + Math.sign(direction) * clientHeight),
  );
  return true;
}
