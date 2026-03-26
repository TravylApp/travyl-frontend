import { Resource } from 'sst'

/**
 * Converts an external image URL to a CDN-proxied URL.
 * For now, returns the original URL since the S3 image pipeline
 * isn't populated yet. Once images are uploaded to S3, this will
 * return the CloudFront URL.
 *
 * This is a forward-looking hook — the CDN infrastructure is provisioned
 * and ready for when the image ingestion pipeline is built.
 */
export function toCdnUrl(externalUrl: string): string {
  // TODO: Once S3 image pipeline is active, rewrite to:
  // const cdnBase = Resource.ActivityCdn.url;
  // const key = hashUrl(externalUrl);
  // return `${cdnBase}/${key}`;
  return externalUrl
}

/**
 * Cache-Control header for image API responses.
 * 24h fresh, 7 day stale-while-revalidate.
 */
export const IMAGE_CACHE_HEADER =
  'public, s-maxage=86400, stale-while-revalidate=604800'
