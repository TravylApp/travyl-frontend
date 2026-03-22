// Recommendation cache
export const cacheTable = new sst.aws.Dynamo('RecommendationCache', {
  fields: {
    pk: 'string',   // {userId}:{destination}
    sk: 'string',   // {travelStyle}:{budgetTier}
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
})

// Activity images + Personalize training data
export const bucket = new sst.aws.Bucket('ActivityAssets')

