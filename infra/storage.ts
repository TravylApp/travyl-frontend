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

// CDN for activity images — deferred until image pipeline is built
// export const cdn = new sst.aws.Router('ActivityCdn', { ... })

// Amazon Location Services — Place Index for POI discovery
export const placeIndex = new aws.location.PlaceIndex('TravylPlaceIndex', {
  indexName: $interpolate`travyl-places-${$app.stage}`,
  dataSource: 'Here',
  dataSourceConfiguration: {
    intendedUse: 'Storage',
  },
})
