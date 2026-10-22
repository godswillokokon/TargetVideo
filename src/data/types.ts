import type { ImageSourcePropType } from 'react-native';

export type Genre = {
  id: string;
  label: string;
};

export type Category = {
  id: string;
  title: string;
  movieIds: string[];
};

export type Copy = {
  app: {
    name: string;
  };
  listSeparator: string;
  accessibilitySeparator: string;
  home: {
    feedLabel: string;
    featuredArtwork: string;
    ratingMeta: string;
    ratedAccessibility: string;
    playLabel: string;
    playAccessibilityLabel: string;
    playAccessibilityHint: string;
    categoriesLabel: string;
    allGenresLabel: string;
    genreAccessibility: string;
    emptyCategory: string;
    posterHint: string;
    posterWithBadge: string;
  };
  player: {
    backLabel: string;
    backAccessibilityLabel: string;
    retryLabel: string;
    loadingLabel: string;
    playbackErrorTitle: string;
    playbackErrorFallback: string;
    durationUnavailable: string;
    playbackFailed: string;
    unavailableTitle: string;
    unavailableBody: string;
    volumeLabel: string;
    muteLabel: string;
    unmuteLabel: string;
    playLabel: string;
    pauseLabel: string;
    playGlyph: string;
    pauseGlyph: string;
    mutedGlyph: string;
    audibleGlyph: string;
    skipSeconds: number;
    skipBackGlyph: string;
    skipBackAccessibility: string;
    skipForwardGlyph: string;
    skipForwardAccessibility: string;
    positionLabel: string;
    hideControlsAccessibility: string;
    showControlsAccessibility: string;
    simulateNoFillLabel: string;
  };
  cliffhanger: {
    lockedLabel: string;
    lockGlyph: string;
    title: string;
    body: string;
    watchAdLabel: string;
    watchAdAccessibility: string;
    laterLabel: string;
    adFailedNotice: string;
  };
  ad: {
    accessibilityLabel: string;
    label: string;
    closeAccessibilityLabel: string;
    closeGlyph: string;
    brand: string;
    headline: string;
    rewardIn: string;
    unlocking: string;
    hint: string;
    durationMs: number;
  };
};

export type CatalogEpisode = {
  number: number;
  title: string;
  label: string;
  video: string | null;
  cliffRatio?: number;
};

export type CatalogSeason = {
  number: number;
  title: string;
  episodes: CatalogEpisode[];
};

export type CatalogMovie = {
  id: string;
  title: string;
  tagline: string | null;
  rating: number | null;
  genres: string[];
  badge: string | null;
  poster: string;
  hero: string | null;
  seasons: CatalogSeason[];
};

/** Raw document in assets/catalog.json. Movies contain seasons, seasons contain episodes. */
export type CatalogFile = {
  featuredMovieId: string;
  copy: Copy;
  genres: Genre[];
  categories: Category[];
  movies: CatalogMovie[];
};

export type ResolvedEpisode = {
  number: number;
  title: string;
  label: string;
  seasonNumber: number;
  videoKey: string | null;
  videoSource: number | null;
  cliffRatio: number | null;
};

export type ResolvedSeason = {
  number: number;
  title: string;
  episodes: ResolvedEpisode[];
};

export type ResolvedMovie = {
  id: string;
  title: string;
  tagline: string | null;
  rating: number | null;
  genres: Genre[];
  badge: 'NEW' | 'PRO' | null;
  poster: ImageSourcePropType;
  hero: ImageSourcePropType | null;
  seasons: ResolvedSeason[];
};

export type PlaybackTarget = {
  movie: ResolvedMovie;
  season: ResolvedSeason;
  episode: ResolvedEpisode;
};
