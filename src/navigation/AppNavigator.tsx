import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/public/HomeScreen';
import { SearchScreen } from '../screens/public/SearchScreen';
import { FeedScreen } from '../screens/public/FeedScreen';
import { ActivityDetailScreen } from '../screens/public/ActivityDetailScreen';
import { FavoritesScreen } from '../screens/user/FavoritesScreen';
import { EstablishmentDashboardScreen } from '../screens/establishment/EstablishmentDashboardScreen';
import { EstablishmentEditScreen } from '../screens/establishment/EstablishmentEditScreen';
import { ActivityEditScreen } from '../screens/establishment/ActivityEditScreen';
import { MediaManagerScreen } from '../screens/establishment/MediaManagerScreen';
import { EventsManagementScreen } from '../screens/establishment/EventsManagementScreen';
import { VerificationRequestScreen } from '../screens/establishment/VerificationRequestScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AccountScreen } from '../screens/common/AccountScreen';

// Types
export type AuthStackParamList = {
  Login: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ActivityDetail: { activityId: string };
};

export type SearchStackParamList = {
  Search: undefined;
  ActivityDetail: { activityId: string };
};

export type FeedStackParamList = {
  Feed: undefined;
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
  EventsManager: undefined;
  VerificationRequest: undefined;
};

export type AccountStackParamList = {
  Account: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  FeedTab: undefined;
  FavoritesTab: undefined;
  EstablishmentTab: undefined;
  AdminTab: undefined;
  AccountTab: undefined;
};

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const SearchStackNav = createNativeStackNavigator<SearchStackParamList>();
const FeedStackNav = createNativeStackNavigator<FeedStackParamList>();
const FavoritesStackNav = createNativeStackNavigator<FavoritesStackParamList>();
const EstablishmentStackNav = createNativeStackNavigator<EstablishmentStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const headerOptions = {
  headerStyle: { backgroundColor: colors.background.secondary },
  headerTitleStyle: { fontWeight: typography.weight.semibold as any, color: colors.text.primary },
  headerTintColor: colors.text.primary,
  headerShadowVisible: false,
};

// Tab Icon component
const TabIcon: React.FC<{ icon: string; focused: boolean }> = ({ icon, focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{icon}</Text>
);

// Home Stack
const HomeStack: React.FC = () => (
  <HomeStackNav.Navigator screenOptions={headerOptions}>
    <HomeStackNav.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    <HomeStackNav.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Detail' }} />
  </HomeStackNav.Navigator>
);

// Search Stack
const SearchStack: React.FC = () => (
  <SearchStackNav.Navigator screenOptions={headerOptions}>
    <SearchStackNav.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
    <SearchStackNav.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Detail' }} />
  </SearchStackNav.Navigator>
);

// Feed Stack
const FeedStack: React.FC = () => (
  <FeedStackNav.Navigator screenOptions={headerOptions}>
    <FeedStackNav.Screen name="Feed" component={FeedScreen} options={{ headerShown: false }} />
    <FeedStackNav.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Detail' }} />
  </FeedStackNav.Navigator>
);

// Favorites Stack
const FavoritesStack: React.FC = () => (
  <FavoritesStackNav.Navigator screenOptions={headerOptions}>
    <FavoritesStackNav.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Mes favoris' }} />
    <FavoritesStackNav.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Detail' }} />
  </FavoritesStackNav.Navigator>
);

// Establishment Stack
const EstablishmentStack: React.FC = () => (
  <EstablishmentStackNav.Navigator screenOptions={headerOptions}>
    <EstablishmentStackNav.Screen name="EstablishmentDashboard" component={EstablishmentDashboardScreen} options={{ title: 'Mon etablissement' }} />
    <EstablishmentStackNav.Screen name="EstablishmentEdit" component={EstablishmentEditScreen} options={{ title: 'Modifier' }} />
    <EstablishmentStackNav.Screen name="ActivityEdit" component={ActivityEditScreen} options={{ title: 'Mon activite' }} />
    <EstablishmentStackNav.Screen name="MediaManager" component={MediaManagerScreen} options={{ title: 'Medias' }} />
    <EstablishmentStackNav.Screen name="EventsManager" component={EventsManagementScreen} options={{ title: 'Evenements' }} />
    <EstablishmentStackNav.Screen name="VerificationRequest" component={VerificationRequestScreen} options={{ title: 'Verification' }} />
  </EstablishmentStackNav.Navigator>
);

// Main Tab Navigator
const MainTabs: React.FC = () => {
  const { isRole } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200],
          paddingTop: 6,
          paddingBottom: 6,
          height: 56,
        },
        tabBarActiveTintColor: colors.neutral[950],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.weight.medium,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon icon={'\u{1F3E0}'} focused={focused} />,
        }}
      />

      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          title: 'Rechercher',
          tabBarIcon: ({ focused }) => <TabIcon icon={'\u{1F50D}'} focused={focused} />,
        }}
      />

      <Tab.Screen
        name="FeedTab"
        component={FeedStack}
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon icon={'\u25B6\uFE0F'} focused={focused} />,
        }}
      />

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

      {isRole('ESTABLISHMENT') && (
        <Tab.Screen
          name="EstablishmentTab"
          component={EstablishmentStack}
          options={{
            title: 'Etablissement',
            tabBarIcon: ({ focused }) => <TabIcon icon={'\u{1F3E2}'} focused={focused} />,
          }}
        />
      )}

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
        <ActivityIndicator size="large" color={colors.neutral[950]} />
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
