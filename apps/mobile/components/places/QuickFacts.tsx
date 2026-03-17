import { View, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { PlaceItem } from '@travyl/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuickFactsProps {
  place: PlaceItem;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuickFacts({ place }: QuickFactsProps) {
  const facts: { icon: string; label: string; value: React.ReactNode }[] = [];

  // Price level
  if (place.priceLevel) {
    const dollars = Array.from({ length: 4 }, (_, i) => (
      <Text
        key={i}
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: i < place.priceLevel! ? '#fff' : 'rgba(255,255,255,0.2)',
        }}
      >
        $
      </Text>
    ));
    facts.push({
      icon: 'dollar',
      label: 'Price',
      value: (
        <View style={{ flexDirection: 'row' }}>{dollars}</View>
      ),
    });
  }

  // Duration
  if (place.duration) {
    facts.push({
      icon: 'clock-o',
      label: 'Duration',
      value: place.duration,
    });
  }

  // Hours
  facts.push({
    icon: 'clock-o',
    label: 'Hours',
    value: place.hours || 'Hours not listed',
  });

  // Rating + reviews
  if (place.rating != null) {
    const reviewText = place.reviewCount
      ? `${place.rating.toFixed(1)} (${formatNumber(place.reviewCount)} reviews)`
      : place.rating.toFixed(1);
    facts.push({
      icon: 'star',
      label: 'Rating',
      value: reviewText,
    });
  }

  // Admission
  facts.push({
    icon: 'ticket',
    label: 'Admission',
    value: place.admissionFee || 'Free',
  });

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
        Quick Facts
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {facts.map((fact, idx) => (
          <View key={idx} style={{ width: '47%', marginBottom: 6 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <FontAwesome
                name={fact.icon as any}
                size={12}
                color="#7dd3fc"
              />
              <Text
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {fact.label}
              </Text>
            </View>
            {typeof fact.value === 'string' ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#fff',
                  marginTop: 2,
                }}
              >
                {fact.value}
              </Text>
            ) : (
              <View style={{ marginTop: 2 }}>{fact.value}</View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
