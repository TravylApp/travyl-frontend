/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'travyl',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage ?? ''),
      home: 'aws',
    }
  },
  async run() {
    const secrets = await import('./infra/secrets')
    const storage = await import('./infra/storage')
    const events = await import('./infra/events')
    const api = await import('./infra/api')
    const web = await import('./infra/web')

    return {
      apiUrl: api.api.url,
      siteUrl: web.site.url,
    }
  },
})
