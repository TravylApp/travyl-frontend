import { api } from './api'
import { pexels } from './secrets'

export const web = new sst.x.DevCommand('TravylWeb', {
  dev: {
    command: 'npm run web',
    directory: 'apps/web',
    autostart: true,
  },
  environment: {
    NEXT_PUBLIC_RECOMMENDATION_API_URL: api.url,
    PEXELS_API_KEY: pexels.value,
  },
})
