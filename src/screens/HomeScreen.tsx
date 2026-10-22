import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PosterCard } from '@/components/PosterCard';
import { ButtonVariant, PrimaryButton } from '@/components/PrimaryButton';
import {
  categories,
  copy,
  fill,
  formatPlaybackKicker,
  formatRating,
  genres,
  getFeaturedMovie,
  heroSource,
  moviesInCategory,
  openingEpisode,
} from '@/data/catalog';
import type { ResolvedMovie } from '@/data/types';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const genreChips = [{ id: 'all', label: copy.home.allGenresLabel }, ...genres];

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [genre, setGenre] = useState('all');
  const featured = getFeaturedMovie();
  const featuredEpisode = openingEpisode(featured);

  const openMovie = useCallback(
    (movie: ResolvedMovie) => {
      const episode = openingEpisode(movie);
      navigation.navigate('Player', {
        movieId: movie.id,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.number,
      });
    },
    [navigation],
  );

  const shelves = useMemo(
    () =>
      categories.map(category => ({
        category,
        items: moviesInCategory(category.id, genre),
      })),
    [genre],
  );

  return (
    <View style={styles.root} accessibilityLabel={copy.home.feedLabel}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={heroSource(featured)}
          style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
          imageStyle={styles.heroImage}
          accessibilityRole="image"
          accessibilityLabel={fill(copy.home.featuredArtwork, {
            title: featured.title,
          })}>
          <View style={styles.heroScrim} />
          <View style={styles.heroTop}>
            <Text style={styles.brand} accessibilityRole="header">
              {copy.app.name}
            </Text>
          </View>
          <View style={styles.heroBody}>
            {featured.tagline ? (
              <Text style={styles.kicker}>{featured.tagline}</Text>
            ) : null}
            <Text style={styles.heroTitle}>{featured.title}</Text>
            <Text
              style={styles.heroMeta}
              accessibilityLabel={[
                featured.rating != null
                  ? fill(copy.home.ratedAccessibility, {
                      rating: formatRating(featured.rating),
                    })
                  : null,
                formatPlaybackKicker(featured, featuredEpisode),
              ]
                .filter(Boolean)
                .join(copy.accessibilitySeparator)}>
              {[
                featured.rating != null
                  ? fill(copy.home.ratingMeta, {
                      rating: formatRating(featured.rating),
                    })
                  : null,
                formatPlaybackKicker(featured, featuredEpisode),
              ]
                .filter(Boolean)
                .join(copy.listSeparator)}
            </Text>
            <PrimaryButton
              label={copy.home.playLabel}
              onPress={() => openMovie(featured)}
              accessibilityLabel={copy.home.playAccessibilityLabel}
              accessibilityHint={fill(copy.home.playAccessibilityHint, {
                title: featured.title,
              })}
              style={styles.playBtn}
            />
          </View>
        </ImageBackground>

        <Text style={styles.sectionLabel} accessibilityRole="header">
          {copy.home.categoriesLabel}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityRole="tablist">
          {genreChips.map(g => {
            const active = g.id === genre;
            return (
              <PrimaryButton
                key={g.id}
                label={g.label}
                variant={active ? ButtonVariant.Primary : ButtonVariant.Ghost}
                onPress={() => setGenre(g.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={fill(copy.home.genreAccessibility, {
                  label: g.label,
                })}
                style={[styles.chip, active && styles.chipActive]}
              />
            );
          })}
        </ScrollView>

        {shelves.map(({ category, items }) => (
          <View key={category.id}>
            <Text style={styles.rowTitle} accessibilityRole="header">
              {category.title}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}>
              {items.length === 0 ? (
                <Text style={styles.emptyRow}>{copy.home.emptyCategory}</Text>
              ) : (
                items.map(item => (
                  <PosterCard
                    key={item.id}
                    title={item.title}
                    poster={item.poster}
                    badge={item.badge ?? undefined}
                    onPress={() => openMovie(item)}
                  />
                ))
              )}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    minHeight: 440,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroImage: {
    opacity: 0.92,
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,13,16,0.58)',
  },
  heroTop: {
    zIndex: 1,
  },
  brand: {
    ...typography.title,
    color: colors.primary,
  },
  heroBody: {
    zIndex: 1,
  },
  kicker: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heroMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  playBtn: {
    alignSelf: 'flex-start',
    minWidth: 148,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  chip: {
    minHeight: 40,
    minWidth: 72,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.primary,
  },
  rowTitle: {
    ...typography.headline,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    minHeight: 48,
    alignItems: 'center',
  },
  emptyRow: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
