import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SearchScreen } from '../screens/public/SearchScreen';
import { ActivityDetailScreen } from '../screens/public/ActivityDetailScreen';
import { VideoFeedScreen } from '../screens/public/VideoFeedScreen';
import { FavoritesScreen } from '../screens/user/FavoritesScreen';
import { EstablishmentDashboardScreen } from '../screens/establishment/EstablishmentDashboardScreen';
import { EstablishmentEditScreen } from '../screens/establishment/EstablishmentEditScreen';
import { ActivityEditScreen } from '../screens/establishment/ActivityEditScreen';
import { MediaManagerScreen } from '../screens/establishment/MediaManagerScreen';
import { EventManagerScreen } from '../screens/establishment/EventManagerScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AccountScreen } from '../screens/common/AccountScreen';

// Types
export type AuthStackParamList = {
  Login: undefined;
};

export type FeedStackParamList = {
  VideoFeed: undefined;
  ActivityDetail: { activityId: string };
};

export type SearchStackParamList = {
  Search: undefined;
  ActivityDetail: { activityId: string };
};

export type FavoritesStackParamList = {
  Favorites: undefined;
  ActivityDetail: { activityId: string };
};

export type EstablishmentStackParamList = {
  EstablishmentDashboard: undefined;
  EstablishmentEdit: undefined;
  ActivityEdit: undefined;
  MediaManager: undefined;
  EventManager: undefined;
};

export type MainTabParamList = {
  FeedTab: undefined;
  SearchTab: undefined;
  FavoritesTab: undefined;
  EstablishmentTab: undefined;
  AdminTab: undefined;
  AccountTab: undefined;
};

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const FeedStackNav = createNativeStackNavigator<FeedStackParamList>();
const SearchStackNav = createNativeStackNavigator<SearchStackParamList>();
const FavoritesStackNav = createNativeStackNavigator<FavoritesStackParamList>();
const EstablishmentStackNav = createNativeStackNavigator<EstablishmentStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab Icon component
const TabIcon: React.FC<{ icon: string; focused: boolean }> = ({ icon, focused }) => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);

// Feed Stack (TikTok-style video feed)
const FeedStack: React.FC = () => (
  <FeedStackNav.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#000' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <FeedStackNav.Screen
      name="VideoFeed"
      component={VideoFeedScreen}
      options={{ title: 'Feed', headerTransparent: true }}
    />
    <FeedStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail', headerStyle: { backgroundColor: '#fff' }, headerTintColor: colors.text.primary }}
    />
  </FeedStackNav.Navigator>
);

// Search Stack
const SearchStack: React.FC = () => (
  <SearchStackNav.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <SearchStackNav.Screen
      name="Search"
      component={SearchScreen}
      options={{ title: 'Explorer' }}
    />
    <SearchStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail' }}
    />
  </SearchStackNav.Navigator>
);

// Favorites Stack
const FavoritesStack: React.FC = () => (
  <FavoritesStackNav.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <FavoritesStackNav.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ title: 'Mes favoris' }}
    />
    <FavoritesStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail' }}
    />
  </FavoritesStackNav.Navigator>
);

// Establishment Stack (with EventManager)
const EstablishmentStack: React.FC = () => (
  <EstablishmentStackNav.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <EstablishmentStackNav.Screen
      name="EstablishmentDashboard"
      component={EstablishmentDashboardScreen}
      options={{ title: 'Mon établissement' }}
    />
    <EstablishmentStackNav.Screen
      name="EstablishmentEdit"
      component={EstablishmentEditScreen}
      options={{ title: 'Modifier' }}
    />
    <EstablishmentStackNav.Screen
      name="ActivityEdit"
      component={ActivityEditScreen}
      options={{ title: 'Mon activité' }}
    />
    <EstablishmentStackNav.Screen
      name="MediaManager"
      component={MediaManagerScreen}
      options={{ title: 'Médias' }}
    />
    <EstablishmentStackNav.Screen
      name="EventManager"
      component={EventManagerScreen}
      options={{ title: 'Événements' }}
    />
  </EstablishmentStackNav.Navigator>
);

// Main Tab Navigator
const MainTabs: React.FC = () => {
  const { isRole } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: colors.neutral[100],
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarLabelStyle: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
        },
        headerShown: false,
      }}
    >
      {/* Feed - Available to all */}
      <Tab.Screen
        name="FeedTab"
        component={FeedStack}
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon icon={'\u25B6\uFE0F'} focused={focused} />,
        }}
      />

      {/* Search - Available to all */}
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          title: 'Explorer',
          tabBarIcon: ({ focused }) => <TabIcon icon={'\u{1F50D}'} focused={focused} />,
        }}
      />

      {/* Favorites - USER only */}
      {isRole('USER') && (
        <Tab.Screen
          name="FavoritesTab"
          component={FavoritesStack}
          options={{
            title: 'Favoris',
            tabBarIcon: ({ focused }) => <TabIcon icon={'\u2764\uFE0F'} focused={focused} />,
          }}
        />
      )}

      {/* Establishment - ESTABLISHMENT only */}
      {isRole('ESTABLISHMENT') && (
        <Tab.Screen
          name="EstablishmentTab"
          component={EstablishmentStack}
          options={{
            title: 'Mon étab.',
            tabBarIcon: ({ focused }) => <TabIcon icon={'\u{1F3E2}'} focused={focused} />,
          }}
        />
      )}

      {/* Admin - ADMIN only */}
      {isRole('ADMIN') && (
        <Tab.Screen
          name="AdminTab"
          component={AdminDashboardScreen}
          options={{
            title: 'Admin',
            tabBarIcon: ({ focused }) => <TabIcon icon={'\u2699\uFE0F'} focused={focused} />,
            headerShown: true,
            headerTitle: 'Administration',
          }}
        />
      )}

      {/* Account - Available to all */}
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{
          title: 'Compte',
          tabBarIcon: ({ focused }) => <TabIcon icon={'\u{1F464}'} focused={focused} />,
          headerShown: true,
          headerTitle: 'Mon compte',
        }}
      />
    </Tab.Navigator>
  );
};

// Auth Navigator
const AuthNavigator: React.FC = () => (
  <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
    <AuthStackNav.Screen name="Login" component={LoginScreen} />
  </AuthStackNav.Navigator>
);

// Root Navigator
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});
