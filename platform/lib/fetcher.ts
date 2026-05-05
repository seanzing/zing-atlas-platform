export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
};
