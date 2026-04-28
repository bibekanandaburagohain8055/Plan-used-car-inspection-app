import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ErrorCard } from '../components/ErrorCard';
import { PhotoAnalysisCard } from '../components/PhotoAnalysisCard';
import { useInspection } from '../context/InspectionContext';
import { PHOTO_CHECKPOINTS } from '../data/checkpoints';
import { colors, commonStyles, radii, spacing } from '../styles/theme';

export function PhotosScreen() {
  const {
    photos,
    capturedPhotoCount,
    photoAnalysis,
    photoAnalyzeLoading,
    photoError,
    doCapturePhoto,
    doAnalyzePhotos,
    clearPhotoError,
    goToStep,
  } = useInspection();

  return (
    <ScrollView contentContainerStyle={commonStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={commonStyles.sectionTitle}>Capture Photos</Text>
      <Text style={commonStyles.bodyText}>
        Capture each checkpoint with the camera, then run AI visual validation.
      </Text>

      <View style={styles.counterPill}>
        <Text style={styles.counterText}>
          {capturedPhotoCount} / {PHOTO_CHECKPOINTS.length} photos captured
        </Text>
      </View>

      {PHOTO_CHECKPOINTS.map((checkpoint) => {
        const photo = photos[checkpoint.id];
        return (
          <View key={checkpoint.id} style={styles.photoCard}>
            <View style={styles.photoInfo}>
              <Text style={styles.photoLabel}>{checkpoint.label}</Text>
              <Text style={styles.photoHint}>{checkpoint.hint}</Text>
              <Text style={photo ? styles.captured : styles.pending}>
                {photo ? 'Captured' : 'Pending'}
              </Text>
            </View>

            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder} />
            )}

            <Pressable style={styles.captureBtn} onPress={() => doCapturePhoto(checkpoint.id)}>
              <Text style={styles.captureBtnText}>{photo ? 'Retake' : 'Capture'}</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        style={[commonStyles.secondaryButton, photoAnalyzeLoading && styles.disabled]}
        onPress={doAnalyzePhotos}
        disabled={photoAnalyzeLoading}
      >
        {photoAnalyzeLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
        <Text style={commonStyles.secondaryButtonText}>
          {photoAnalyzeLoading ? 'Analyzing...' : 'Run AI Photo Validation'}
        </Text>
      </Pressable>

      {photoError ? <ErrorCard message={photoError} onDismiss={clearPhotoError} /> : null}
      {photoAnalysis ? <PhotoAnalysisCard data={photoAnalysis} /> : null}

      <Pressable style={commonStyles.primaryButton} onPress={() => goToStep('structural')}>
        <Text style={commonStyles.primaryButtonText}>Continue to Structural Check</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  counterPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(15, 42, 59, 0.12)',
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  counterText: {
    fontSize: 12,
    color: '#2f5161',
    fontWeight: '700',
  },
  photoCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 46, 63, 0.12)',
    backgroundColor: colors.white,
    padding: 10,
    gap: spacing.sm,
  },
  photoInfo: { gap: 2 },
  photoLabel: { color: '#173546', fontWeight: '800', fontSize: 14 },
  photoHint: { color: '#4d6876', fontSize: 12, lineHeight: 17 },
  pending: { color: colors.medium, fontWeight: '700', fontSize: 12 },
  captured: { color: colors.low, fontWeight: '700', fontSize: 12 },
  thumb: { width: '100%', height: 140, borderRadius: 10, backgroundColor: '#f0f5f8' },
  thumbPlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 49, 66, 0.15)',
    borderStyle: 'dashed',
    backgroundColor: '#f7fbfd',
  },
  captureBtn: {
    borderWidth: 1,
    borderColor: 'rgba(16, 49, 66, 0.16)',
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    paddingVertical: 9,
    alignItems: 'center',
  },
  captureBtnText: { color: '#1f4658', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
