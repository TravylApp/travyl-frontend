import { userInteractions } from './storage'

export const bus = new sst.aws.Bus('InteractionBus')

bus.subscribe('InteractionBusSubscriber', {
  handler: 'services/processInteraction.handler',
  link: [userInteractions],
})
