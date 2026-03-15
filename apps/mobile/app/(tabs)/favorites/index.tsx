import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { MOCK_PLACES, Navy, type PlaceItem } from '@travyl/shared';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 10;
const PADDING_H = 16;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING_H * 2 - COLUMN_GAP) / 2;

type TabKey = 'all' | 'destination' | 'attraction' | 'restaurant' | 'experience' | 'event';
type SortKey = 'default' | 'top_rated' | 'az';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'globe' },
  { key: 'destination', label: 'Destinations', icon: 'map-marker' },
  { key: 'attraction', label: 'Attractions', icon: 'university' },
  { key: 'restaurant', label: 'Restaurants', icon: 'cutlery' },
  { key: 'experience', label: 'Experiences', icon: 'compass' },
  { key: 'event', label: 'Events', icon: 'calendar' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'az', label: 'A-Z' },
];

function getCardHeight(item: PlaceItem): number {
  return 120 + (item.id.charCodeAt(item.id.length - 1) % 4) * 20;
}

export default function FavoritesScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const filteredPlaces = useMemo(() => {
    let result = [...MOCK_PLACES];

    // Filter by tab
    if (activeTab !== 'all') {
      result = result.filter((p) => p.type === activeTab);
    }

    // Filter by search
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

    // Sort
    if (sortBy === 'top_rated') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'az') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [activeTab, searchQuery, sortBy]);

  const renderPlaceCard = ({ item, index }: { item: PlaceItem; index: number }) => {
    const imageHeight = getCardHeight(item);
    const isFav = favorites.includes(item.id);

    return (
      <Pressable
        onPress={() => setSelectedPlace(item)}
        style={{
          width: CARD_WIDTH,
          marginBottom: 14,
          marginLeft: index % 2 === 0 ? 0 : COLUMN_GAP,
          borderRadius: 14,
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
          overflow: 'hidden',
        }}
      >
        {/* Image */}
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: item.image }}
            style={{ width: '100%', height: imageHeight, borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
            resizeMode="cover"
          />

          {/* Category badge top-left */}
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: 'rgba(255,255,255,0.92)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: Navy.DEFAULT }}>{item.category}</Text>
          </View>

          {/* Heart button top-right */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item.id);
            }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.92)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={14} color={isFav ? '#ef4444' : '#9ca3af'} />
          </Pressable>

          {/* Rating badge bottom-left */}
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <FontAwesome name="star" size={10} color="#fbbf24" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginLeft: 3 }}>
              {item.rating}
            </Text>
          </View>
        </View>

        {/* Text content */}
        <View style={{ padding: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f2937' }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }} numberOfLines={1}>
            {item.tagline}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
      <FontAwesome name="search" size={48} color="#d1d5db" />
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#9ca3af', marginTop: 16 }}>
        No places match your search
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ paddingHorizontal: PADDING_H, paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: Navy.DEFAULT }}>Places</Text>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: PADDING_H, paddingVertical: 8 }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: 20,
                paddingBottom: 6,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? Navy.DEFAULT : 'transparent',
              }}
            >
              <FontAwesome
                name={tab.icon as any}
                size={14}
                color={isActive ? Navy.DEFAULT : '#9ca3af'}
                style={{ marginRight: 5 }}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? Navy.DEFAULT : '#9ca3af',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search bar */}
      <View style={{ paddingHorizontal: PADDING_H, paddingVertical: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f3f4f6',
            borderRadius: 24,
            paddingHorizontal: 14,
            height: 42,
          }}
        >
          <FontAwesome name="search" size={14} color="#9ca3af" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search places, categories, tags..."
            placeholderTextColor="#9ca3af"
            style={{
              flex: 1,
              fontSize: 14,
              color: '#1f2937',
              marginLeft: 10,
              paddingVertical: 0,
            }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Sort pills */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: PADDING_H,
          paddingBottom: 8,
        }}
      >
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortBy === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: isActive ? Navy.DEFAULT : '#f3f4f6',
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isActive ? '#fff' : '#6b7280',
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Masonry-style 2-column FlatList */}
      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderPlaceCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{
          paddingHorizontal: PADDING_H,
          paddingTop: 4,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selectedPlace}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPlace(null)}
      >
        {selectedPlace && (
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <ScrollView bounces={false}>
              {/* Image */}
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: selectedPlace.image }}
                  style={{ width: '100%', height: 300 }}
                  resizeMode="cover"
                />

                {/* Category badge */}
                <View
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Navy.DEFAULT }}>
                    {selectedPlace.category}
                  </Text>
                </View>

                {/* Close button */}
                <Pressable
                  onPress={() => setSelectedPlace(null)}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FontAwesome name="times" size={18} color="#fff" />
                </Pressable>

                {/* Rating badge */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                  }}
                >
                  <FontAwesome name="star" size={13} color="#fbbf24" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginLeft: 5 }}>
                    {selectedPlace.rating}
                  </Text>
                </View>
              </View>

              {/* Content */}
              <View style={{ padding: 20 }}>
                {/* Type label */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: Navy.DEFAULT,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  {selectedPlace.type}
                </Text>

                <Text style={{ fontSize: 24, fontWeight: '800', color: '#1f2937', marginBottom: 4 }}>
                  {selectedPlace.name}
                </Text>

                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                  {selectedPlace.tagline}
                </Text>

                <Text style={{ fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 20 }}>
                  {selectedPlace.description}
                </Text>

                {/* Tags */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 }}>
                  {(selectedPlace.tags ?? []).map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: '#f3f4f6',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#4b5563' }}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {/* Save/Unsave button */}
                <Pressable
                  onPress={() => toggleFavorite(selectedPlace.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: favorites.includes(selectedPlace.id) ? '#fee2e2' : Navy.DEFAULT,
                    height: 50,
                    borderRadius: 14,
                  }}
                >
                  <FontAwesome
                    name={favorites.includes(selectedPlace.id) ? 'heart' : 'heart-o'}
                    size={16}
                    color={favorites.includes(selectedPlace.id) ? '#ef4444' : '#fff'}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: favorites.includes(selectedPlace.id) ? '#ef4444' : '#fff',
                    }}
                  >
                    {favorites.includes(selectedPlace.id) ? 'Unsave' : 'Save Place'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}
