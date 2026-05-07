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

// Temp document uploads for OCR parsing — auto-deleted after read or 1hr safety net
export const documentUploads = new sst.aws.Bucket('DocumentUploads', {
  public: false,
  cors: {
    allowOrigins: ['*'],
    allowMethods: ['PUT', 'OPTIONS'],
    allowHeaders: ['*'],
    exposeHeaders: ['ETag'],
    maxAge: '1 hour',
  },
})

// Lifecycle: auto-delete uploads/ objects after 1 hour (safety net for abandoned uploads)
const documentLifecycle = new aws.s3.BucketLifecycleConfigurationV2('DocumentUploadsLifecycle', {
  bucket: documentUploads.name,
  rules: [{
    id: 'expire-uploads',
    status: 'Enabled',
    filter: {
      prefix: 'uploads/',
    },
    expiration: {
      days: 1,
    },
  }],
})

// CDN for serving optimized activity images from S3
export const activityCdn = new sst.aws.Router('ActivityCdn', {
  routes: {
    '/*': {
      bucket,
    },
  },
})

// Amazon Location Services — Place Index for POI discovery
export const placeIndex = new aws.location.PlaceIndex('TravylPlaceIndex', {
  indexName: $interpolate`travyl-places-${$app.stage}`,
  dataSource: 'Here',
  dataSourceConfiguration: {
    intendedUse: 'Storage',
  },
})

// User interaction events + affinity aggregates for personalized recommendations
export const userInteractions = new sst.aws.Dynamo('UserInteractions', {
  fields: { pk: 'string', sk: 'string' },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
})
