import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { verificationApi } from '../../api/verification';
import { VerificationRequest, VerificationStatus } from '../../types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Button, Badge, EmptyState } from '../../components/ui';

const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; variant: 'warning' | 'success' | 'error'; icon: string }
> = {
  PENDING: {
    label: 'En attente de verification',
    variant: 'warning',
    icon: '\u23F3',
  },
  APPROVED: {
    label: 'Verifie',
    variant: 'success',
    icon: '\u2705',
  },
  REJECTED: {
    label: 'Refuse',
    variant: 'error',
    icon: '\u274C',
  },
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const VerificationRequestScreen: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await verificationApi.getRequests();
      setRequests(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des demandes');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchRequests();
      setIsLoading(false);
    };
    load();
  }, [fetchRequests]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchRequests();
    setIsRefreshing(false);
  };

  const pickAndUploadDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission requise',
        "Autorisez l'acces a la galerie pour selectionner un document."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const fileName = asset.uri.split('/').pop() || 'document.jpg';
    const fileType = asset.mimeType || 'image/jpeg';

    setIsUploading(true);
    try {
      await verificationApi.uploadDocuments([
        { uri: asset.uri, name: fileName, type: fileType },
      ]);
      await fetchRequests();
      Alert.alert('Succes', 'Votre document a ete envoye avec succes.');
    } catch (err: any) {
      Alert.alert(
        'Erreur',
        err.message || "Erreur lors de l'envoi du document."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const latestRequest = requests.length > 0 ? requests[0] : null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.neutral[950]} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error && requests.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>{'\u26A0\uFE0F'}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Reessayer"
          onPress={fetchRequests}
          variant="primary"
          size="md"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.neutral[950]}
        />
      }
    >
      {/* Upload Progress Banner */}
      {isUploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.uploadingText}>Envoi du document en cours...</Text>
        </View>
      )}

      {/* Current Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>Statut de verification</Text>

        {latestRequest ? (
          <View style={styles.statusContent}>
            <View style={styles.statusRow}>
              <Text style={styles.statusIcon}>
                {STATUS_CONFIG[latestRequest.status].icon}
              </Text>
              <Badge
                label={STATUS_CONFIG[latestRequest.status].label}
                variant={STATUS_CONFIG[latestRequest.status].variant}
                size="md"
              />
            </View>

            {latestRequest.status === 'APPROVED' && (
              <Text style={styles.statusDetail}>
                Approuve le {formatDate(latestRequest.updatedAt)}
              </Text>
            )}

            {latestRequest.status === 'REJECTED' && latestRequest.adminNote && (
              <View style={styles.adminNoteContainer}>
                <Text style={styles.adminNoteLabel}>Note de l'administrateur :</Text>
                <Text style={styles.adminNoteText}>{latestRequest.adminNote}</Text>
              </View>
            )}

            {latestRequest.status === 'PENDING' && (
              <Text style={styles.statusDetail}>
                Soumis le {formatDate(latestRequest.createdAt)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.noStatusContainer}>
            <Text style={styles.noStatusIcon}>{'\u{1F4CB}'}</Text>
            <Text style={styles.noStatusText}>
              Aucune demande de verification en cours.
            </Text>
            <Text style={styles.noStatusSubtext}>
              Envoyez un document pour commencer le processus de verification.
            </Text>
          </View>
        )}
      </View>

      {/* Upload Section */}
      <View style={styles.uploadCard}>
        <Text style={styles.cardTitle}>Envoyer un document</Text>
        <Text style={styles.uploadDescription}>
          Selectionnez une image de votre document d'identite, extrait Kbis, ou
          tout autre justificatif pour verifier votre etablissement.
        </Text>
        <Button
          title={isUploading ? 'Envoi en cours...' : 'Choisir un document'}
          onPress={pickAndUploadDocument}
          variant="primary"
          size="lg"
          fullWidth
          loading={isUploading}
          disabled={isUploading}
        />
      </View>

      {/* Request History */}
      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Historique des demandes</Text>

        {requests.length === 0 ? (
          <EmptyState
            icon={'\u{1F4C4}'}
            title="Aucune demande"
            description="Vous n'avez pas encore soumis de demande de verification."
          />
        ) : (
          <View style={styles.requestList}>
            {requests.map((request) => (
              <View key={request.id} style={styles.requestItem}>
                <View style={styles.requestHeader}>
                  <Badge
                    label={STATUS_CONFIG[request.status].label}
                    variant={STATUS_CONFIG[request.status].variant}
                    size="sm"
                  />
                  <Text style={styles.requestDate}>
                    {formatDate(request.createdAt)}
                  </Text>
                </View>

                {request.documents.length > 0 && (
                  <Text style={styles.documentCount}>
                    {request.documents.length}{' '}
                    {request.documents.length === 1 ? 'document' : 'documents'}{' '}
                    soumis
                  </Text>
                )}

                {request.message && (
                  <Text style={styles.requestMessage} numberOfLines={2}>
                    {request.message}
                  </Text>
                )}

                {request.status === 'REJECTED' && request.adminNote && (
                  <View style={styles.requestAdminNote}>
                    <Text style={styles.requestAdminNoteText}>
                      {request.adminNote}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tips Section */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Comment fonctionne la verification ?</Text>
        <View style={styles.tipItem}>
          <Text style={styles.tipNumber}>1</Text>
          <Text style={styles.tipText}>
            Envoyez un justificatif officiel (Kbis, piece d'identite, facture...).
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipNumber}>2</Text>
          <Text style={styles.tipText}>
            Notre equipe examine votre document sous 48 heures ouvrees.
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipNumber}>3</Text>
          <Text style={styles.tipText}>
            Une fois approuve, votre etablissement recoit le badge verifie.
          </Text>
        </View>
        <View style={styles.tipDivider} />
        <Text style={styles.tipFooter}>
          {'\u2022'} Les documents sont traites de maniere confidentielle.{'\n'}
          {'\u2022'} Formats acceptes : JPEG, PNG.{'\n'}
          {'\u2022'} En cas de refus, vous pouvez soumettre un nouveau document.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  contentContainer: {
    paddingBottom: spacing['3xl'],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.md,
    color: colors.text.tertiary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: typography.size.md,
    color: colors.error.main,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Upload progress banner
  uploadingBanner: {
    backgroundColor: colors.neutral[950],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  uploadingText: {
    color: colors.text.inverse,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  // Status card
  statusCard: {
    backgroundColor: colors.background.elevated,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  statusContent: {
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusIcon: {
    fontSize: 20,
  },
  statusDetail: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  adminNoteContainer: {
    backgroundColor: colors.error.main + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error.main,
  },
  adminNoteLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.error.dark,
    marginBottom: spacing.xs,
  },
  adminNoteText: {
    fontSize: typography.size.sm,
    color: colors.error.dark,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  noStatusContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noStatusIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  noStatusText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  noStatusSubtext: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Upload card
  uploadCard: {
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  uploadDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },

  // History card
  historyCard: {
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  requestList: {
    gap: spacing.md,
  },
  requestItem: {
    backgroundColor: colors.background.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requestDate: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  documentCount: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  requestMessage: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  requestAdminNote: {
    marginTop: spacing.sm,
    backgroundColor: colors.error.main + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  requestAdminNoteText: {
    fontSize: typography.size.xs,
    color: colors.error.dark,
  },

  // Tips card
  tipsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primary.main + '10',
    borderRadius: borderRadius.lg,
  },
  tipsTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.primary.dark,
    marginBottom: spacing.lg,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.main,
    color: colors.primary.contrast,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  tipText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.primary.dark,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  tipDivider: {
    height: 1,
    backgroundColor: colors.primary.main + '20',
    marginVertical: spacing.md,
  },
  tipFooter: {
    fontSize: typography.size.xs,
    color: colors.primary.dark,
    lineHeight: typography.size.xs * typography.lineHeight.relaxed,
  },
});
