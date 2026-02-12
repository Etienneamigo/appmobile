import React, { useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/public/HomeScreen';
import { FeedScreen } from '../screens/public/FeedScreen';
import { SearchScreen } from '../screens/public/SearchScreen';
import { ActivityDetailScreen } from '../screens/public/ActivityDetailScreen';
import { FavoritesScreen } from '../screens/user/FavoritesScreen';
import { EstablishmentDashboardScreen } from '../screens/establishment/EstablishmentDashboardScreen';
import { EstablishmentEditScreen } from '../screens/establishment/EstablishmentEditScreen';
import { ActivityEditScreen } from '../screens/establishment/ActivityEditScreen';
import { ActivityCreateScreen } from '../screens/establishment/ActivityCreateScreen';
import { MediaManagerScreen } from '../screens/establishment/MediaManagerScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AccountScreen } from '../screens/common/AccountScreen';

// Types
export type HomeStackParamList = {
  Home: undefined;
  ActivityDetail: { activityId: string };
};

export type FeedStackParamList = {
  Feed: undefined;
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
  ActivityCreate: undefined;
  MediaManager: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  FeedTab: undefined;
  SearchTab: undefined;
  FavoritesTab: undefined;
  EstablishmentTab: undefined;
  AdminTab: undefined;
  AccountTab: undefined;
};

const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const FeedStackNav = createNativeStackNavigator<FeedStackParamList>();
const SearchStackNav = createNativeStackNavigator<SearchStackParamList>();
const FavoritesStackNav = createNativeStackNavigator<FavoritesStackParamList>();
const EstablishmentStackNav = createNativeStackNavigator<EstablishmentStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: '#fff' },
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
  headerTintColor: colors.text.primary,
};

// Tab Icon component
const TabIcon: React.FC<{ icon: string; focused: boolean }> = ({ icon, focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{icon}</Text>
);

// Home Stack
const HomeStack: React.FC = () => (
  <HomeStackNav.Navigator screenOptions={defaultScreenOptions}>
    <HomeStackNav.Screen
      name="Home"
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <HomeStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail', headerTransparent: true, headerTitle: '' }}
    />
  </HomeStackNav.Navigator>
);

// Feed Stack
const FeedStack: React.FC = () => (
  <FeedStackNav.Navigator screenOptions={defaultScreenOptions}>
    <FeedStackNav.Screen
      name="Feed"
      component={FeedScreen}
      options={{ headerShown: false }}
    />
    <FeedStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail', headerTransparent: true, headerTitle: '' }}
    />
  </FeedStackNav.Navigator>
);

// Search Stack
const SearchStack: React.FC = () => (
  <SearchStackNav.Navigator screenOptions={defaultScreenOptions}>
    <SearchStackNav.Screen
      name="Search"
      component={SearchScreen}
      options={{ headerShown: false }}
    />
    <SearchStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail', headerTransparent: true, headerTitle: '' }}
    />
  </SearchStackNav.Navigator>
);

// Favorites Stack
const FavoritesStack: React.FC = () => (
  <FavoritesStackNav.Navigator screenOptions={defaultScreenOptions}>
    <FavoritesStackNav.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ title: 'Mes favoris' }}
    />
    <FavoritesStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail', headerTransparent: true, headerTitle: '' }}
    />
  </FavoritesStackNav.Navigator>
);

// Establishment Stack
const EstablishmentStack: React.FC = () => (
  <EstablishmentStackNav.Navigator screenOptions={defaultScreenOptions}>
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
      name="ActivityCreate"
      component={ActivityCreateScreen}
      options={{ title: 'Créer une activité' }}
    />
    <EstablishmentStackNav.Screen
      name="MediaManager"
      component={MediaManagerScreen}
      options={{ title: 'Médias' }}
    />
  </EstablishmentStackNav.Navigator>
);

// Main Tab Navigator - Matches web's MobileBottomNav role-based structure
const MainTabs: React.FC = () => {
  const { isRole } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200],
          paddingTop: 6,
          paddingBottom: 6,
          height: 56,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: typography.weight.medium,
        },
        headerShown: false,
      }}
    >
      {/* Home - Available to all (matches web Accueil) */}
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />

      {/* Admin - ADMIN only (matches web: Admin tab in position 2) */}
      {isRole('ADMIN') && (
        <Tab.Screen
          name="AdminTab"
          component={AdminDashboardScreen}
          options={{
            title: 'Admin',
            tabBarIcon: ({ focused }) => <TabIcon icon="🛡️" focused={focused} />,
            headerShown: true,
            headerTitle: 'Administration',
          }}
        />
      )}

      {/* Feed - Available to all (matches web Feed) */}
      <Tab.Screen
        name="FeedTab"
        component={FeedStack}
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon icon="▶️" focused={focused} />,
        }}
      />

      {/* Establishment - ESTABLISHMENT only (matches web Activité) */}
      {isRole('ESTABLISHMENT') && (
        <Tab.Screen
          name="EstablishmentTab"
          component={EstablishmentStack}
          options={{
            title: 'Activité',
            tabBarIcon: ({ focused }) => <TabIcon icon="🏢" focused={focused} />,
          }}
        />
      )}

      {/* Search - Available to all (matches web Recherche) */}
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          title: 'Recherche',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} />,
        }}
      />

      {/* Favorites - USER only (matches web Favoris) */}
      {isRole('USER') && (
        <Tab.Screen
          name="FavoritesTab"
          component={FavoritesStack}
          options={{
            title: 'Favoris',
            tabBarIcon: ({ focused }) => <TabIcon icon="❤️" focused={focused} />,
          }}
        />
      )}

      {/* Account - Available to all (matches web Compte) */}
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{
          title: 'Compte',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
          headerShown: true,
          headerTitle: 'Mon compte',
        }}
      />
    </Tab.Navigator>
  );
};

// Auth Navigator with Login/Register switching
const AuthNavigator: React.FC = () => {
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />;
  }

  return <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />;
};

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
    backgroundColor: colors.background.secondary,
  },
});
