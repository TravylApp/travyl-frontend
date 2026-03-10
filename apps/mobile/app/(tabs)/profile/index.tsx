import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Image, TextInput, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useAuthStore, useProfile, Navy,
  PROFILE_FAVORITES, TRAVEL_BOARDS, BOARD_FILTER_TAGS, CATEGORY_TAGS,
} from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
const { width: SCREEN_W } = Dimensions.get('window');

function BoardCard({ board }: { board: typeof TRAVEL_BOARDS[number] }) {
  const colors = useThemeColors();
  const firstImage = board.images?.[0];
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
      {firstImage && (
        <Image source={{ uri: firstImage }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
      )}
      <View style={{ padding: 10, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{board.title}</Text>
          {board.badge && (
            <View style={{ backgroundColor: board.badgeColor ?? '#f59e0b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff' }}>{board.badge}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={2}>{board.subtitle}</Text>
        <Text style={{ fontSize: 10, color: colors.textTertiary }}>{board.saves} saves</Text>
      </View>
    </View>
  );
}

function FavoriteCard({ fav }: { fav: typeof PROFILE_FAVORITES[number] }) {
  const colors = useThemeColors();
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, marginBottom: 10 }}>
      <Image source={{ uri: fav.image }} style={{ width: '100%', height: 110 }} resizeMode="cover" />
      <View style={{ padding: 8, gap: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>{fav.name}</Text>
        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{fav.country}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
          <FontAwesome name="star" size={9} color="#f59e0b" />
          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text }}>{fav.rating}</Text>
          <Text style={{ fontSize: 9, color: colors.textTertiary, marginLeft: 4 }}>{fav.category}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile } = useProfile();

  const [profileTab, setProfileTab] = useState<'boards' | 'favorites'>('boards');
  const [favFilter, setFavFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const isAuthenticated = !!user;
  const displayName = isAuthenticated
    ? (profile?.display_name ?? user.email?.split('@')[0] ?? 'User')
    : 'Alex Rivera';
  const initials = displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const filteredFavorites = useMemo(() => {
    let items = [...PROFILE_FAVORITES];
    if (favFilter !== 'All') {
      const isBoardName = BOARD_FILTER_TAGS.includes(favFilter);
      if (isBoardName) {
        items = items.filter((f) => f.board === favFilter);
      } else {
        items = items.filter((f) => f.tags.some((t) => t.toLowerCase() === favFilter.toLowerCase()));
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((f) => f.name.toLowerCase().includes(q) || f.country.toLowerCase().includes(q));
    }
    return items;
  }, [favFilter, searchQuery]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated && !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.skeleton, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 28, color: colors.textTertiary }}>?</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Sign in to view your profile</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>Create an account to save trips, track favorites, and sync across devices.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          style={{ height: 44, width: '100%', borderRadius: 12, backgroundColor: Navy.DEFAULT, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const CARD_W_HALF = (SCREEN_W - 48) / 2;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} showsVerticalScrollIndicator={false}>
      {/* Navy Header */}
      <View style={{ backgroundColor: Navy.DEFAULT, paddingTop: 48, paddingBottom: 20, alignItems: 'center' }}>
        {/* Settings link */}
        <Pressable
          onPress={() => router.push('/profile/settings')}
          style={{ position: 'absolute', top: 48, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <FontAwesome name="cog" size={13} color="rgba(255,255,255,0.4)" />
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Settings</Text>
        </Pressable>

        {/* Avatar */}
        <View style={{ position: 'relative', marginBottom: 10 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#2a4d78', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>{initials}</Text>
          </View>
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#3b82f6', borderWidth: 2, borderColor: Navy.DEFAULT, alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="camera" size={10} color="#fff" />
          </View>
        </View>

        <Text style={{ fontSize: 18, color: '#fff', fontWeight: '600' }}>{displayName}</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'center', paddingHorizontal: 40 }}>
          Travel enthusiast exploring the world one destination at a time.
        </Text>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
          {[
            { value: '23', label: 'Countries' },
            { value: '28', label: 'Places' },
            { value: String(PROFILE_FAVORITES.length), label: 'Favorites' },
            { value: String(TRAVEL_BOARDS.length), label: 'Boards' },
          ].map((stat) => (
            <View key={stat.label} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#fff', fontWeight: '600' }}>{stat.value}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tab bar */}
      <View style={{ backgroundColor: colors.cardBackground, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable
          onPress={() => setProfileTab('boards')}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: profileTab === 'boards' ? Navy.DEFAULT : 'transparent' }}
        >
          <Text style={{ fontSize: 12, color: profileTab === 'boards' ? Navy.DEFAULT : colors.textTertiary, fontWeight: profileTab === 'boards' ? '600' : '400' }}>
            Travel Boards ({TRAVEL_BOARDS.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setProfileTab('favorites')}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: profileTab === 'favorites' ? Navy.DEFAULT : 'transparent' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FontAwesome name="heart" size={10} color={profileTab === 'favorites' ? Navy.DEFAULT : colors.textTertiary} />
            <Text style={{ fontSize: 12, color: profileTab === 'favorites' ? Navy.DEFAULT : colors.textTertiary, fontWeight: profileTab === 'favorites' ? '600' : '400' }}>
              Favorites ({PROFILE_FAVORITES.length})
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Content */}
      <View style={{ padding: 16 }}>
        {profileTab === 'boards' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {TRAVEL_BOARDS.map((board) => (
              <View key={board.id} style={{ width: CARD_W_HALF }}>
                <BoardCard board={board} />
              </View>
            ))}
          </View>
        ) : (
          <View>
            {/* Favorites filter bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
              {BOARD_FILTER_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setFavFilter(favFilter === tag ? 'All' : tag)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
                    borderWidth: 1,
                    backgroundColor: favFilter === tag ? Navy.DEFAULT : colors.cardBackground,
                    borderColor: favFilter === tag ? Navy.DEFAULT : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 10, color: favFilter === tag ? '#fff' : colors.textSecondary }}>{tag}</Text>
                </Pressable>
              ))}
              {CATEGORY_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setFavFilter(favFilter === tag ? 'All' : tag)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
                    borderWidth: 1,
                    backgroundColor: favFilter === tag ? Navy.DEFAULT : colors.cardBackground,
                    borderColor: favFilter === tag ? Navy.DEFAULT : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 10, color: favFilter === tag ? '#fff' : colors.textSecondary }}>{tag}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, marginBottom: 12 }}>
              <FontAwesome name="search" size={12} color={colors.textTertiary} />
              <TextInput
                placeholder="Search favorites..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, fontSize: 12, color: colors.text }}
              />
              <Text style={{ fontSize: 10, color: colors.textTertiary }}>{filteredFavorites.length} results</Text>
            </View>

            {/* Favorites grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {filteredFavorites.map((fav) => (
                <View key={fav.id} style={{ width: CARD_W_HALF }}>
                  <FavoriteCard fav={fav} />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Sign Out */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Pressable
          onPress={() => signOut()}
          style={{ height: 44, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#dc2626' }}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
