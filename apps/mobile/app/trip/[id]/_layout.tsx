import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

export default function TripLayout() {
  return (
    <TopTabs
      screenOptions={{
        tabBarScrollEnabled: true,
        tabBarItemStyle: { width: 'auto' },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
        tabBarActiveTintColor: '#003594',
        tabBarInactiveTintColor: '#999',
        tabBarIndicatorStyle: { backgroundColor: '#003594' },
      }}
    >
      <TopTabs.Screen name="index" options={{ title: 'Overview' }} />
      <TopTabs.Screen name="itinerary" options={{ title: 'Itinerary' }} />
      <TopTabs.Screen name="flights" options={{ title: 'Flights' }} />
      <TopTabs.Screen name="hotels" options={{ title: 'Hotels' }} />
      <TopTabs.Screen name="cars" options={{ title: 'Car Rental' }} />
      <TopTabs.Screen name="budget" options={{ title: 'Budget' }} />
      <TopTabs.Screen name="packing" options={{ title: 'Packing' }} />
      <TopTabs.Screen name="activities" options={{ title: 'Activities' }} />
      <TopTabs.Screen name="restaurants" options={{ title: 'Restaurants' }} />
      <TopTabs.Screen name="favorites" options={{ title: 'Favorites' }} />
    </TopTabs>
  );
}
