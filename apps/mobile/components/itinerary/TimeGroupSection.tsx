import { View, Text, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TIME_OF_DAY_CONFIG } from '@travyl/shared';
import type { TimeGroup } from '@travyl/shared';
import { ActivityCard } from './ActivityCard';

interface TimeGroupSectionProps {
  group: TimeGroup;
  collapsed?: boolean;
  onToggleCollapse?: (timeOfDay: string) => void;
  onAddActivity?: (timeOfDay: string) => void;
  onActivityPress?: (activityId: string) => void;
  activityImages?: Record<string, string>;
  colorOverride?: string;
}

const ICON_MAP: Record<string, string> = {
  sun: 'sun-o',
  sunset: 'sun-o',
  moon: 'moon-o',
};

export function TimeGroupSection({ group, collapsed, onToggleCollapse, onAddActivity, onActivityPress, activityImages, colorOverride }: TimeGroupSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const config = TIME_OF_DAY_CONFIG[group.timeOfDay];
  const color = colorOverride ?? config.iconColor;
  const count = group.activities.length;
  const iconName = ICON_MAP[config.icon] ?? 'sun-o';

  useEffect(() => {
    if (collapsed !== undefined) {
      setExpanded(!collapsed);
    }
  }, [collapsed]);

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse(group.timeOfDay);
    } else {
      setExpanded(!expanded);
    }
  };

  const isExpanded = collapsed !== undefined ? !collapsed : expanded;

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={handleToggle} style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: color,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <FontAwesome name={iconName as any} size={18} color="#fff" />
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  {config.label}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                  {count} {count === 1 ? 'activity' : 'activities'}
                </Text>
              </View>
            </View>
            <FontAwesome
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color="rgba(255,255,255,0.7)"
            />
          </View>
        </Pressable>
      </View>

      {isExpanded && (
        <View style={{ marginTop: 10, gap: 10 }}>
          {group.activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} onPress={onActivityPress ? () => onActivityPress(activity.id) : undefined} imageUrl={activityImages?.[activity.id]} />
          ))}

          {onAddActivity && (
            <Pressable
              onPress={() => onAddActivity(group.timeOfDay)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: color + '35',
              }}
            >
              <FontAwesome name="plus" size={13} color={color} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: color }}>
                Add {config.label} Activity
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
