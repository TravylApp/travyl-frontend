import type { ActivityDetail } from '@travyl/shared'
import { EntitySection } from '../EntitySection'
import { EntityTagList } from '../EntityTagList'

interface Props {
  activity: ActivityDetail
}

export function ActivityAbout({ activity }: Props) {
  return (
    <EntitySection title="About">
      {activity.source === 'ai' && activity.reason && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Recommended for you:</span> {activity.reason}
          </p>
        </div>
      )}

      {activity.description && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{activity.description}</p>
      )}

      <EntityTagList tags={[activity.category]} />
    </EntitySection>
  )
}
