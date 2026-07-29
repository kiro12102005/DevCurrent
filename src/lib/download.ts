// Client-side-only file download - no server round trip needed since the
// content is already in memory (a summary the user is looking at, or their
// own saved-articles list).
export function downloadTextFile(filename: string, content: string, mimeType = "text/markdown;charset=utf-8") {
  downloadBlob(filename, new Blob([content], { type: mimeType }));
}

// Shared by downloadTextFile above and by downloads that already have a Blob
// in hand (e.g. an <img> fetched from a server-generated PNG).
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
