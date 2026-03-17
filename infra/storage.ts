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

// CDN for activity images
export const cdn = new sst.aws.Router('ActivityCdn', {
  routes: {
    '/*': bucket.name,
  },
})
