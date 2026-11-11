export const isOfflineEdition = () => globalThis.document?.documentElement?.dataset?.tobOffline === "true";

// Resolve only displayed images. Source URLs and saved build documents stay intact.
let icons;
export function setPlannerHtml(root, markup) {
  if (!isOfflineEdition()) {
    // Also works under a project URL such as /TOB/ on GitHub Pages.
    root.innerHTML = markup.replaceAll('src="/assets/', 'src="./assets/');
    return;
  }
  const doc = root.ownerDocument;
  icons ??= new Map(JSON.parse(doc.getElementById("offline-icons").textContent));
  const template = doc.createElement("template");
  template.innerHTML = markup;
  for (const img of template.content.querySelectorAll("img[src]")) {
    const src = img.getAttribute("src");
    if (src.startsWith("/assets/")) img.setAttribute("src", "." + src);
    else if (/^https?:/i.test(src)) {
      img.setAttribute("src", icons.get(src) ?? "./assets/offline-icon.svg");
    }
  }
  root.replaceChildren(template.content);
}
