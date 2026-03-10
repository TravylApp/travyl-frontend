import { View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export function RatingStars({ rating, size = 12 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: full }).map((_, i) => (
        <FontAwesome key={`f${i}`} name="star" size={size} color="#fbbf24" />
      ))}
      {half && <FontAwesome name="star-half-o" size={size} color="#fbbf24" />}
      {Array.from({ length: empty }).map((_, i) => (
        <FontAwesome key={`e${i}`} name="star-o" size={size} color="#e5e7eb" />
      ))}
    </View>
  );
}
