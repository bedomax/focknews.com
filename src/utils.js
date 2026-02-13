/**
 * Remove UTM and common tracking parameters from a URL.
 */
function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'utm_id', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid',
    ];
    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }
    // Remove trailing slash for consistency
    let normalized = url.toString();
    if (normalized.endsWith('/') && url.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return rawUrl;
  }
}

module.exports = { normalizeUrl };
