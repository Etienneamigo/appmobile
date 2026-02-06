import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SearchScreen } from '../screens/public/SearchScreen';
import { ActivityDetailScreen } from '../screens/public/ActivityDetailScreen';
import { FavoritesScreen } from '../screens/user/FavoritesScreen';
import { EstablishmentDashboardScreen } from '../screens/establishment/EstablishmentDashboardScreen';
import { EstablishmentEditScreen } from '../screens/establishment/EstablishmentEditScreen';
import { ActivityEditScreen } from '../screens/establishment/ActivityEditScreen';
import { MediaManagerScreen } from '../screens/establishment/MediaManagerScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AccountScreen } from '../screens/common/AccountScreen';

// Types
export type AuthStackParamList = {
  Login: undefined;
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
};

export type MainTabParamList = {
  SearchTab: undefined;
  FavoritesTab: undefined;
  EstablishmentTab: undefined;
  AdminTab: undefined;
  AccountTab: undefined;
};

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const SearchStackNav = createNativeStackNavigator<SearchStackParamList>();
const FavoritesStackNav = createNativeStackNavigator<FavoritesStackParamList>();
const EstablishmentStackNav = createNativeStackNavigator<EstablishmentStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Dark navigation theme
const darkNavTheme = {
  dark: true,
  colors: {
    primary: colors.primary.main,
    background: colors.background.primary,
    card: colors.background.secondary,
    text: colors.text.primary,
    border: colors.border.default,
    notification: colors.primary.main,
  },
  fonts: DefaultTheme.fonts,
};

// Shared stack screen options for dark theme
const darkStackScreenOptions = {
  headerStyle: { backgroundColor: colors.background.secondary },
  headerTintColor: colors.text.primary,
  headerTitleStyle: {
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
};

// Tab Icon component
const TabIcon: React.FC<{ icon: string; focused: boolean }> = ({ icon, focused }) => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);

// Search Stack
const SearchStack: React.FC = () => (
  <SearchStackNav.Navigator screenOptions={darkStackScreenOptions}>
    <SearchStackNav.Screen
      name="Search"
      component={SearchScreen}
      options={{ title: 'Activit\u00e9s' }}
    />
    <SearchStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'D\u00e9tail' }}
    />
  </SearchStackNav.Navigator>
);

// Favorites Stack
const FavoritesStack: React.FC = () => (
  <FavoritesStackNav.Navigator screenOptions={darkStackScreenOptions}>
    <FavoritesStackNav.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ title: 'Mes favoris' }}
    />
    <FavoritesStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'D\u00e9tail' }}
    />
  </FavoritesStackNav.Navigator>
);

// Establishment Stack
const EstablishmentStack: React.FC = () => (
  <EstablishmentStackNav.Navigator screenOptions={darkStackScreenOptions}>
    <EstablishmentStackNav.Screen
      name="EstablishmentDashboard"
      component={EstablishmentDashboardScreen}
      options={{ title: 'Mon \u00e9tablissement' }}
    />
    <EstablishmentStackNav.Screen
      name="EstablishmentEdit"
      component={EstablishmentEditScreen}
      options={{ title: 'Modifier' }}
    />
    <EstablishmentStackNav.Screen
      name="ActivityEdit"
      component={ActivityEditScreen}
      options={{ title: 'Mon activit\u00e9' }}
    />
    <EstablishmentStackNav.Screen
      name="MediaManager"
      component={MediaManagerScreen}
      options={{ title: 'M\u00e9dias' }}
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
          backgroundColor: colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: colors.border.default,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.disabled,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      {/* Search - Available to all */}
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          title: 'Explorer',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} />,
        }}
      />

      {/* Favorites - USER only */}
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

      {/* Establishment - ESTABLISHMENT only */}
      {isRole('ESTABLISHMENT') && (
        <Tab.Screen
          name="EstablishmentTab"
          component={EstablishmentStack}
          options={{
            title: 'Mon \u00e9tablissement',
            tabBarIcon: ({ focused }) => <TabIcon icon="🏢" focused={focused} />,
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
            tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
            headerShown: true,
            headerTitle: 'Administration',
            headerStyle: { backgroundColor: colors.background.secondary },
            headerTintColor: colors.text.primary,
            headerTitleStyle: {
              fontWeight: '600',
              color: colors.text.primary,
            },
          }}
        />
      )}

      {/* Account - Available to all */}
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{
          title: 'Compte',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
          headerShown: true,
          headerTitle: 'Mon compte',
          headerStyle: { backgroundColor: colors.background.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.text.primary,
          },
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
    <NavigationContainer theme={darkNavTheme}>
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
