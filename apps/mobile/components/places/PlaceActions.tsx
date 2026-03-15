import { View, Text, Pressable, Linking, Platform, Share } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { PlaceItem } from '@travyl/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaceActionsProps {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav: () => void;
}

interface ActionButton {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function openDirections(place: PlaceItem) {
  if (place.latitude != null && place.longitude != null) {
    const url = Platform.select({
      ios: `maps:0,0?daddr=${place.latitude},${place.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`,
    });
    Linking.openURL(url);
  } else if (place.address) {
    const encoded = encodeURIComponent(place.address);
    const url = Platform.select({
      ios: `maps:0,0?daddr=${encoded}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    });
    Linking.openURL(url);
  }
}

async function sharePlace(place: PlaceItem) {
  try {
    await Share.share({
      message: `Check out ${place.name}!${place.website ? `\n${place.website}` : ''}`,
    });
  } catch {
    // user cancelled
  }
}

function getTypeActions(place: PlaceItem): ActionButton[] {
  const noop = () => {};

  switch (place.type) {
    case 'restaurant':
      return [
        { icon: 'book', label: 'View Menu', onPress: noop },
        { icon: 'calendar', label: 'Book a Table', onPress: noop, primary: true },
      ];
    case 'attraction':
      return [
        { icon: 'ticket', label: 'Buy Tickets', onPress: noop },
        { icon: 'external-link', label: 'Book', onPress: noop, primary: true },
      ];
    case 'experience':
      return [
        { icon: 'calendar-check-o', label: 'Availability', onPress: noop },
        { icon: 'external-link', label: 'Book', onPress: noop, primary: true },
      ];
    case 'destination':
      return [
        { icon: 'map', label: 'Plan Trip', onPress: noop },
        { icon: 'external-link', label: 'Book', onPress: noop, primary: true },
      ];
    case 'event':
      return [
        { icon: 'ticket', label: 'Get Tickets', onPress: noop },
        { icon: 'external-link', label: 'Book', onPress: noop, primary: true },
      ];
    default:
      return [
        { icon: 'external-link', label: 'Book', onPress: noop, primary: true },
      ];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlaceActions({
  place,
  isFav,
  onToggleFav,
}: PlaceActionsProps) {
  const commonActions: ActionButton[] = [
    {
      icon: 'location-arrow',
      label: 'Directions',
      onPress: () => openDirections(place),
    },
    {
      icon: 'share-alt',
      label: 'Share',
      onPress: () => sharePlace(place),
    },
  ];

  const typeActions = getTypeActions(place);
  const allActions = [...commonActions, ...typeActions];

  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: 14,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: '#fff',
          marginBottom: 10,
        }}
      >
        Actions
      </Text>

      {/* ── 2x2 button grid ─────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {allActions.map((action, idx) => (
          <Pressable
            key={idx}
            onPress={action.onPress}
            style={({ pressed }) => ({
              width: '47%',
              backgroundColor: action.primary
                ? 'rgba(125,211,252,0.15)'
                : 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: action.primary
                ? 'rgba(125,211,252,0.2)'
                : 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 12,
              alignItems: 'center' as const,
              gap: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <FontAwesome
              name={action.icon as any}
              size={16}
              color="#7dd3fc"
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Coordinates row ─────────────────────────────────────────── */}
      {place.latitude != null && place.longitude != null && (
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: 10,
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FontAwesome name="globe" size={12} color="#7dd3fc" />
          <Text
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Coordinates
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#fff',
              marginLeft: 'auto',
            }}
          >
            {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
          </Text>
        </View>
      )}
    </View>
  );
}
