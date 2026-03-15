import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { MOCK_PLACES, Navy, groupPlacesByCollection, type PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ExplorePreview } from '@/components/home/ExplorePreview';
import { OceanWave, Footer } from '@/components/home';
import PlaceDetailModal from '@/components/places/PlaceDetailModal';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = 16;
const GAP = 8;
const STACK_CARD_W = SCREEN_WIDTH * 0.72;
const STACK_CARD_H = STACK_CARD_W * 1.3;

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getImageHeight(id: string): number {
  return 140 + (hashCode(id + 'h') % 100);
}

function balanceColumns(places: PlaceItem[]): [PlaceItem[], PlaceItem[]] {
  const left: PlaceItem[] = [];
  const right: PlaceItem[] = [];
  let leftH = 0;
  let rightH = 0;
  for (const place of places) {
    const h = getImageHeight(place.id) + 70;
    if (leftH <= rightH) { left.push(place); leftH += h; }
    else { right.push(place); rightH += h; }
  }
  return [left, right];
}

type TabKey = 'all' | 'destination' | 'attraction' | 'restaurant' | 'experience' | 'event' | 'favorites';
type SortKey = 'default' | 'top_rated' | 'az';
type ViewMode = 'grid' | 'stack';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'globe' },
  { key: 'destination', label: 'Destinations', icon: 'map-marker' },
  { key: 'attraction', label: 'Attractions', icon: 'university' },
  { key: 'restaurant', label: 'Restaurants', icon: 'cutlery' },
  { key: 'experience', label: 'Experiences', icon: 'compass' },
  { key: 'event', label: 'Events', icon: 'calendar' },
  { key: 'favorites', label: 'Favorites', icon: 'heart' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'az', label: 'A-Z' },
];

/* ═══════════════ Grid Place Card ═══════════════ */

const GridPlaceCard = memo(function GridPlaceCard({
  place, isFav, onPress, onToggleFav, colors,
}: {
  place: PlaceItem;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const imgH = getImageHeight(place.id);
  const imgs = place.images && place.images.length > 1 ? place.images : [place.image];
  const [imgIdx, setImgIdx] = useState(0);
  const hasMultiple = imgs.length > 1;

  return (
    <Pressable onPress={onPress} style={{ marginBottom: GAP }}>
      <View style={{
        borderRadius: 14, overflow: 'hidden',
        backgroundColor: colors.cardBackground,
        borderWidth: 1, borderColor: colors.border,
      }}>
        <View style={{ height: imgH, position: 'relative' }}>
          <Image source={imgs[imgIdx]} style={{ width: '100%', height: imgH }} contentFit="cover" cachePolicy="memory-disk" transition={200} />

          {hasMultiple && (
            <Pressable
              onPress={() => setImgIdx((prev) => (prev + 1) % imgs.length)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}

          {/* Heart button — top-right */}
          <Pressable
            onPress={onToggleFav}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: isFav ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.9)',
              borderWidth: isFav ? 1 : 0,
              borderColor: 'rgba(239,68,68,0.4)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={12} color={isFav ? '#ef4444' : '#9ca3af'} />
          </Pressable>

          {/* Gradient overlay */}
          <View pointerEvents="none" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: imgH * 0.4,
            backgroundColor: 'transparent',
          }} />

          {/* Centered dot indicators */}
          {hasMultiple && (
            <View pointerEvents="none" style={{
              position: 'absolute', bottom: 8,
              left: 0, right: 0,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
            }}>
              {imgs.map((_, i) => (
                <View key={i} style={{
                  width: imgIdx === i ? 14 : 5, height: 5, borderRadius: 3,
                  backgroundColor: imgIdx === i ? '#fff' : 'rgba(255,255,255,0.5)',
                }} />
              ))}
            </View>
          )}
        </View>

        {/* Content below image — matches web PinCard style */}
        <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <FontAwesome name="map-marker" size={9} color={colors.textTertiary} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 10, color: colors.textTertiary, flex: 1 }} numberOfLines={1}>{place.tagline}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>{place.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
              <FontAwesome name="star" size={10} color="#fbbf24" style={{ marginRight: 2 }} />
              <Text style={{ fontSize: 10, fontWeight: '500', color: colors.textSecondary }}>{place.rating}</Text>
            </View>
          </View>
          {place.description && (
            <Text style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 14 }} numberOfLines={2}>{place.description}</Text>
          )}
          {place.tags && place.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {place.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={{
                  paddingHorizontal: 6, paddingVertical: 2,
                  backgroundColor: colors.surface, borderRadius: 10,
                }}>
                  <Text style={{ fontSize: 9, color: colors.textTertiary }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});


/* ═══════════════ Main Screen ═══════════════ */

export default function FavoritesScreen() {
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [showcaseIdx, setShowcaseIdx] = useState(-1); // -1 = hidden

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  // Prefetch images so they're cached when the tab loads
  useEffect(() => {
    Image.prefetch(MOCK_PLACES.map((p) => p.image));
  }, []);

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return MOCK_PLACES;
    if (activeTab === 'favorites') return MOCK_PLACES.filter((p) => favorites.includes(p.id));
    return MOCK_PLACES.filter((p) => p.type === activeTab);
  }, [activeTab, favorites]);

  const subcategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of tabFiltered) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
  }, [tabFiltered]);

  const filteredPlaces = useMemo(() => {
    let result = [...tabFiltered];
    if (activeSubcategory) result = result.filter((p) => p.category === activeSubcategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'top_rated') result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [tabFiltered, activeSubcategory, searchQuery, sortBy]);

  const themedSections = useMemo(() => groupPlacesByCollection(filteredPlaces), [filteredPlaces]);

  const openShowcase = useCallback((placeId: string) => {
    const idx = filteredPlaces.findIndex((p) => p.id === placeId);
    if (idx !== -1) setShowcaseIdx(idx);
  }, [filteredPlaces]);

  const closeModal = useCallback(() => setSelectedPlace(null), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>Places</Text>
              <View style={{
                backgroundColor: colors.cardBackground, borderRadius: 10,
                paddingHorizontal: 8, paddingVertical: 2,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary }}>
                  {filteredPlaces.length}
                </Text>
              </View>
            </View>

            {/* View mode toggle */}
            <View style={{
              flexDirection: 'row', backgroundColor: colors.cardBackground,
              borderRadius: 20, padding: 3, borderWidth: 1, borderColor: colors.border,
            }}>
              {(['grid', 'stack'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: viewMode === mode ? '#fff' : 'transparent',
                    shadowColor: viewMode === mode ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: viewMode === mode ? 0.1 : 0,
                    shadowRadius: 2,
                  }}
                >
                  <FontAwesome
                    name={mode === 'grid' ? 'th-large' : 'clone'}
                    size={14}
                    color={viewMode === mode ? Navy.DEFAULT : colors.textTertiary}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: PAD }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => { setActiveTab(tab.key); setActiveSubcategory(''); }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 10, paddingVertical: 8, marginRight: 4,
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? Navy.DEFAULT : 'transparent',
                }}
              >
                <FontAwesome
                  name={tab.icon as any}
                  size={12}
                  color={isActive ? Navy.DEFAULT : colors.textTertiary}
                  style={{ marginRight: 5 }}
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? Navy.DEFAULT : colors.textTertiary,
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ height: 1, backgroundColor: colors.border }} />

        {/* Subcategory pills */}
        {subcategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: PAD, paddingVertical: 8 }}
          >
            <Pressable
              onPress={() => setActiveSubcategory('')}
              style={{
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginRight: 6,
                backgroundColor: !activeSubcategory ? Navy.DEFAULT : colors.cardBackground,
              }}
            >
              <Text style={{
                fontSize: 11, fontWeight: '600',
                color: !activeSubcategory ? '#fff' : colors.textSecondary,
              }}>All</Text>
            </Pressable>
            {subcategories.map((cat) => {
              const isActive = activeSubcategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveSubcategory(isActive ? '' : cat)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginRight: 6,
                    backgroundColor: isActive ? Navy.DEFAULT : colors.cardBackground,
                  }}
                >
                  <Text style={{
                    fontSize: 11, fontWeight: '600',
                    color: isActive ? '#fff' : colors.textSecondary,
                  }}>{cat}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Search + Sort row */}
        <View style={{ paddingHorizontal: PAD, paddingBottom: 10, paddingTop: subcategories.length > 1 ? 0 : 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Pressable
              onPress={() => {
                const keys: SortKey[] = ['default', 'top_rated', 'az'];
                const idx = keys.indexOf(sortBy);
                setSortBy(keys[(idx + 1) % keys.length]);
              }}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 12, height: 36, borderRadius: 20,
                backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border,
              }}
            >
              <FontAwesome name="sort" size={11} color={colors.textTertiary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>
                {SORT_OPTIONS.find((o) => o.key === sortBy)?.label}
              </Text>
            </Pressable>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.cardBackground, borderRadius: 20,
              borderWidth: 1, borderColor: colors.border,
              paddingHorizontal: 12, height: 36,
            }}>
              <FontAwesome name="search" size={12} color={colors.textTertiary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search places..."
                placeholderTextColor={colors.textTertiary}
                style={{ flex: 1, fontSize: 12, color: colors.text, marginLeft: 8, paddingVertical: 0 }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <FontAwesome name="times-circle" size={14} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Content: Grid or Stack */}
        {viewMode === 'grid' ? (
          <View style={{ paddingHorizontal: PAD }}>
            {filteredPlaces.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <FontAwesome name="search" size={36} color={colors.textTertiary} />
                <Text style={{ fontSize: 15, color: colors.textTertiary, marginTop: 12 }}>
                  {activeTab === 'favorites' ? 'No favorites yet' : 'No places match your search'}
                </Text>
              </View>
            )}

            {themedSections.sections.map(({ collection, places: sectionPlaces }) => {
              const [left, right] = balanceColumns(sectionPlaces);
              return (
                <View key={collection.key} style={{ marginBottom: 8 }}>
                  {/* Section heading */}
                  <View style={{
                    borderTopWidth: 1, borderTopColor: colors.border,
                    paddingTop: 16, paddingBottom: 12, marginTop: 8,
                  }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e3a5f' }}>
                      {collection.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                      {sectionPlaces.length} places
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: GAP, alignItems: 'flex-start' }}>
                    {[left, right].map((col, colIdx) => (
                      <View key={colIdx} style={{ flex: 1 }}>
                        {col.map((place) => (
                          <GridPlaceCard
                            key={place.id}
                            place={place}
                            isFav={favorites.includes(place.id)}
                            onPress={() => openShowcase(place.id)}
                            onToggleFav={() => toggleFavorite(place.id)}
                            colors={colors}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

          </View>
        ) : (
          /* Stack view — tinder-style card carousel */
          <View style={{ flex: 1 }}>
            {filteredPlaces.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <FontAwesome name="search" size={36} color={colors.textTertiary} />
                <Text style={{ fontSize: 15, color: colors.textTertiary, marginTop: 12 }}>
                  {activeTab === 'favorites' ? 'No favorites yet' : 'No places match your search'}
                </Text>
              </View>
            ) : (
              <CardStackCarousel
                places={filteredPlaces}
                favorites={favorites}
                onToggleFav={toggleFavorite}
                cardWidth={STACK_CARD_W}
                cardHeight={STACK_CARD_H}
                enableMagazine
                onCardPress={(_place, idx) => setShowcaseIdx(idx)}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Card Stack Showcase — full screen overlay when tapping a card */}
      {showcaseIdx >= 0 && filteredPlaces[showcaseIdx] && (
        <CardStackCarousel
          places={filteredPlaces}
          initialIndex={showcaseIdx}
          favorites={favorites}
          onToggleFav={toggleFavorite}
          overlay
          enableMagazine
          onClose={() => setShowcaseIdx(-1)}
        />
      )}

      {/* Detail Modal — shared component */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          allPlaces={MOCK_PLACES}
          onClose={closeModal}
          favorites={favorites}
          onToggleFav={toggleFavorite}
          onSearchTag={(query) => {
            setSearchQuery(query);
            setSelectedPlace(null);
          }}
          renderFooter={(currentPlace) => (
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              <ExplorePreview contextPlace={currentPlace} />
              <OceanWave />
              <Footer />
            </View>
          )}
        />
      )}
    </View>
  );
}
