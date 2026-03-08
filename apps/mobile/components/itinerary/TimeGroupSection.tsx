import { View, Text, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TIME_OF_DAY_CONFIG } from '@travyl/shared';
import type { TimeGroup } from '@travyl/shared';
import { ActivityCard } from './ActivityCard';

interface TimeGroupSectionProps {
  group: TimeGroup;
  collapsed?: boolean;
  onToggleCollapse?: (timeOfDay: string) => void;
  onAddActivity?: (timeOfDay: string) => void;
}

const ICON_MAP: Record<string, string> = {
  sun: 'sun-o',
  sunset: 'sun-o',
  moon: 'moon-o',
};

export function TimeGroupSection({ group, collapsed, onToggleCollapse, onAddActivity }: TimeGroupSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const config = TIME_OF_DAY_CONFIG[group.timeOfDay];
  const count = group.activities.length;
  const iconName = ICON_MAP[config.icon] ?? 'sun-o';

  // Sync with parent collapsed state
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
        {/* Main header - pressable to collapse */}
        <Pressable onPress={handleToggle} style={{ flex: 1 }}>
          <LinearGradient
            colors={[config.iconColor, config.iconColor + 'cc']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Add Activity button */}
              {onAddActivity && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onAddActivity(group.timeOfDay);
                  }}
                  hitSlop={6}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <FontAwesome name="plus" size={10} color="#fff" />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>Add</Text>
                </Pressable>
              )}
              <FontAwesome
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color="rgba(255,255,255,0.7)"
              />
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {isExpanded && (
        <View style={{ marginTop: 10, gap: 10 }}>
          {group.activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </View>
      )}
    </View>
  );
}
