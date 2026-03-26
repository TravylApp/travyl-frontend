import type { ActivityDetail } from '@travyl/shared'
import { Clock, Wallet, MapPin, Group, Language } from 'iconoir-react'
import { EntitySection } from '../EntitySection'
import { EntityQuickInfo } from '../EntityQuickInfo'

interface Props {
  activity: ActivityDetail
}

export function ActivityDetails({ activity }: Props) {
  const items = [
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Duration',
      value: activity.duration ? `${activity.duration} hour${activity.duration !== 1 ? 's' : ''}` : '',
    },
    {
      icon: <Wallet className="w-4 h-4" />,
      label: 'Price per person',
      value: activity.price != null
        ? `${activity.currency ?? 'USD'} ${activity.price}`
        : '',
    },
    {
      icon: <MapPin className="w-4 h-4" />,
      label: 'Meeting point',
      value: activity.meetingPoint ?? '',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Available times',
      value: activity.availableTimes?.join(', ') ?? '',
    },
    {
      icon: <Group className="w-4 h-4" />,
      label: 'Group size',
      value: activity.groupSize ? `Up to ${activity.groupSize} people` : '',
    },
    {
      icon: <Language className="w-4 h-4" />,
      label: 'Languages',
      value: activity.languages?.join(', ') ?? '',
    },
  ]

  return (
    <EntitySection title="Details">
      <EntityQuickInfo items={items} />
    </EntitySection>
  )
}
