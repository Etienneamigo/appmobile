import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { config } from '../../config';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Icon } from '../../components/Icon';

const ROLE_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  ESTABLISHMENT: 'Établissement',
  ADMIN: 'Administrateur',
};

export const AccountScreen: React.FC = () => {
  const { user, logout, isRole } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.name || user.email)[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user.name || 'Utilisateur'}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {ROLE_LABELS[user.role] || user.role}
          </Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rôle</Text>
            <Text style={styles.infoValue}>
              {ROLE_LABELS[user.role] || user.role}
            </Text>
          </View>
          {user.name && (
            <>
              <View style={styles.separator} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nom</Text>
                <Text style={styles.infoValue}>{user.name}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Application</Text>
            <Text style={styles.infoValue}>{config.APP_NAME}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{config.APP_VERSION}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      {isRole('USER') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MyReservations')}
            activeOpacity={0.7}
          >
            <Icon name="clipboard" size={22} color={colors.text.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionLabel}>Mes réservations</Text>
              <Text style={styles.actionDesc}>Voir et gérer vos réservations</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API URL</Text>
            <Text style={[styles.infoValue, { fontSize: 11 }]} selectable>{config.BASE_URL}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={[styles.infoValue, { fontSize: 11 }]} selectable>{user.id}</Text>
          </View>
          {user.establishmentId && (
            <>
              <View style={styles.separator} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Establishment</Text>
                <Text style={[styles.infoValue, { fontSize: 11 }]} selectable>{user.establishmentId}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
    color: colors.primary.contrast,
  },
  name: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  email: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: typography.size.sm,
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },
  section: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    gap: spacing.md,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  actionDesc: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 24,
    color: colors.text.tertiary,
    fontWeight: typography.weight.bold,
  },
  logoutButton: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.error.main,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
