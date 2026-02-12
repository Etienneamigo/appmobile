import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Badge, Button } from '../../components/ui';
import { BASE_URL } from '../../api/client';

const ROLE_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  ESTABLISHMENT: 'Etablissement',
  ADMIN: 'Administrateur',
};

const LEGAL_LINKS = [
  { label: 'Mentions legales', path: '/mentions-legales' },
  { label: 'Politique de confidentialite', path: '/politique-confidentialite' },
  { label: 'Politique cookies', path: '/politique-cookies' },
  { label: 'Conditions generales d\'utilisation', path: '/cgu' },
  { label: 'Conditions generales de vente', path: '/cgv' },
  { label: 'Contact', path: '/contact' },
];

export const AccountScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Etes-vous sur de vouloir vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnexion',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const openLegalLink = (path: string) => {
    Linking.openURL(`${BASE_URL}${path}`).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien.');
    });
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.name || user.email)[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user.name || 'Utilisateur'}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Badge
          label={ROLE_LABELS[user.role] || user.role}
          variant="primary"
          size="md"
          style={styles.roleBadge}
        />
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
            <Text style={styles.infoLabel}>Role</Text>
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

      {/* Legal Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations legales</Text>
        <View style={styles.card}>
          {LEGAL_LINKS.map((link, index) => (
            <React.Fragment key={link.path}>
              {index > 0 && <View style={styles.separator} />}
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => openLegalLink(link.path)}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>{link.label}</Text>
                <Text style={styles.linkArrow}>&#8250;</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>2.0.0</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Serveur</Text>
            <Text style={styles.infoValue}>wadelo.com</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <Button
          title="Se deconnecter"
          onPress={handleLogout}
          variant="destructive"
          fullWidth
        />
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    paddingBottom: spacing['4xl'],
  },
  header: {
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[950],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  name: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  email: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    marginTop: spacing.md,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  linkText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    flex: 1,
  },
  linkArrow: {
    fontSize: typography.size.lg,
    color: colors.text.disabled,
    marginLeft: spacing.sm,
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
});
