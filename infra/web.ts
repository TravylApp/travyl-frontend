import { api } from './api'

export const web = new sst.x.DevCommand('TravylWeb', {
  dev: {
    command: 'npm run web',
    directory: 'apps/web',
    autostart: true,
  },
  environment: {
    NEXT_PUBLIC_RECOMMENDATION_API_URL: api.url,
  },
})
