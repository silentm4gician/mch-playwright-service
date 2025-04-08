export default function cleanRedirectUrl(url) {
  try {
    const parsed = new URL(url);
    const rawId = parsed.searchParams.get("id");
    if (rawId && rawId.startsWith("http")) {
      return decodeURIComponent(rawId);
    }
    return url;
  } catch (e) {
    return url;
  }
}
