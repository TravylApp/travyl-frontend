// Recommendation cache
export const cacheTable = new sst.aws.Dynamo('RecommendationCache', {
  fields: {
    pk: 'string',
    sk: 'string',
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
})

// Activity images + Personalize training data
export const bucket = new sst.aws.Bucket('ActivityAssets')

// Note: CDN for activity images will be configured once the bucket has content.
// sst.aws.Router requires a full URL, not a bucket name — will set up with
// bucket's regional domain URL after first deploy.
