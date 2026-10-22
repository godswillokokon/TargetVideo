import catalogFile from '@assets/catalog.json';
import { imageFor, videoFor } from '@/data/assets';
import type {
  CatalogEpisode,
  CatalogFile,
  Category,
  Copy,
  Genre,
  PlaybackTarget,
  ResolvedEpisode,
  ResolvedMovie,
  ResolvedSeason,
} from '@/data/types';

const BADGES = new Set(['NEW', 'PRO']);
const catalog: CatalogFile = catalogFile;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function badgeOf(movieId: string, badge: string | null): 'NEW' | 'PRO' | null {
  if (badge == null) {
    return null;
  }
  assert(BADGES.has(badge), `Movie "${movieId}" has unknown badge "${badge}"`);
  return badge as 'NEW' | 'PRO';
}

function resolveEpisode(
  movieId: string,
  seasonNumber: number,
  episode: CatalogEpisode,
): ResolvedEpisode {
  assert(episode.label.trim().length > 0, `${movieId} S${seasonNumber}E${episode.number} needs a label`);
  if (episode.video == null) {
    return {
      number: episode.number,
      title: episode.title,
      label: episode.label,
      seasonNumber,
      videoKey: null,
      videoSource: null,
      cliffRatio: null,
    };
  }

  const cliffRatio = episode.cliffRatio;
  assert(
    typeof cliffRatio === 'number' && cliffRatio > 0 && cliffRatio < 1,
    `${movieId} S${seasonNumber}E${episode.number} needs cliffRatio between 0 and 1`,
  );

  return {
    number: episode.number,
    title: episode.title,
    label: episode.label,
    seasonNumber,
    videoKey: episode.video,
    videoSource: videoFor(episode.video),
    cliffRatio,
  };
}

function assertFilled(value: unknown, path: string): void {
  if (typeof value === 'string') {
    assert(value.trim().length > 0, `Copy ${path} is empty`);
    return;
  }
  if (typeof value === 'number') {
    assert(Number.isFinite(value) && value > 0, `Copy ${path} must be a positive number`);
    return;
  }
  assert(value != null && typeof value === 'object', `Copy ${path} is missing`);
  for (const [key, child] of Object.entries(value)) {
    assertFilled(child, `${path}.${key}`);
  }
}

function resolveCatalog(file: CatalogFile): {
  genres: Genre[];
  categories: Category[];
  movies: ResolvedMovie[];
  featuredMovieId: string;
} {
  assertFilled(file.copy, 'copy');

  const genreById = new Map<string, Genre>();
  for (const genre of file.genres) {
    assert(!genreById.has(genre.id), `Duplicate genre "${genre.id}"`);
    genreById.set(genre.id, genre);
  }

  const movieIds = new Set<string>();
  const movies: ResolvedMovie[] = file.movies.map(movie => {
    assert(movie.id && !movieIds.has(movie.id), `Duplicate movie "${movie.id}"`);
    movieIds.add(movie.id);
    assert(movie.seasons.length > 0, `Movie "${movie.id}" has no seasons`);

    const genres = movie.genres.map(genreId => {
      const genre = genreById.get(genreId);
      assert(genre, `Movie "${movie.id}" references unknown genre "${genreId}"`);
      return genre;
    });

    const seasonNumbers = new Set<number>();
    const seasons: ResolvedSeason[] = movie.seasons.map(season => {
      assert(
        !seasonNumbers.has(season.number),
        `Movie "${movie.id}" has duplicate season ${season.number}`,
      );
      seasonNumbers.add(season.number);
      assert(
        season.episodes.length > 0,
        `Movie "${movie.id}" season ${season.number} has no episodes`,
      );

      const episodeNumbers = new Set<number>();
      const episodes = season.episodes.map(episode => {
        assert(
          !episodeNumbers.has(episode.number),
          `Movie "${movie.id}" S${season.number} has duplicate episode ${episode.number}`,
        );
        episodeNumbers.add(episode.number);
        return resolveEpisode(movie.id, season.number, episode);
      });
      episodes.sort((a, b) => a.number - b.number);

      return {
        number: season.number,
        title: season.title,
        episodes,
      };
    });
    seasons.sort((a, b) => a.number - b.number);

    return {
      id: movie.id,
      title: movie.title,
      tagline: movie.tagline,
      rating: movie.rating,
      genres,
      badge: badgeOf(movie.id, movie.badge),
      poster: imageFor(movie.poster),
      hero: movie.hero ? imageFor(movie.hero) : null,
      seasons,
    };
  });

  const movieById = new Map(movies.map(movie => [movie.id, movie]));
  assert(
    movieById.has(file.featuredMovieId),
    `featuredMovieId "${file.featuredMovieId}" does not match a movie`,
  );

  const categoryIds = new Set<string>();
  for (const category of file.categories) {
    assert(!categoryIds.has(category.id), `Duplicate category "${category.id}"`);
    categoryIds.add(category.id);
    const seen = new Set<string>();
    for (const movieId of category.movieIds) {
      assert(movieById.has(movieId), `Category "${category.id}" references unknown movie "${movieId}"`);
      assert(!seen.has(movieId), `Category "${category.id}" lists "${movieId}" more than once`);
      seen.add(movieId);
    }
  }

  return {
    genres: file.genres,
    categories: file.categories,
    movies,
    featuredMovieId: file.featuredMovieId,
  };
}

const resolved = resolveCatalog(catalog);
const movieById = new Map(resolved.movies.map(movie => [movie.id, movie]));

export const genres: readonly Genre[] = resolved.genres;
export const categories: readonly Category[] = resolved.categories;
export const copy: Copy = catalog.copy;

/** Fill `{placeholders}` in a string from the payload. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value == null ? '' : String(value);
  });
}

export function playbackErrorText(message: string | null): string {
  if (message === 'duration_unavailable') {
    return copy.player.durationUnavailable;
  }
  if (message === 'playback_failed') {
    return copy.player.playbackFailed;
  }
  return message ?? copy.player.playbackErrorFallback;
}

function getMovie(movieId: string): ResolvedMovie {
  const movie = movieById.get(movieId);
  assert(movie, `Unknown movie "${movieId}"`);
  return movie;
}

export function getFeaturedMovie(): ResolvedMovie {
  return getMovie(resolved.featuredMovieId);
}

/** First episode of the first season. Every movie has one. */
export function openingEpisode(movie: ResolvedMovie): ResolvedEpisode {
  const season = movie.seasons[0];
  const episode = season?.episodes[0];
  assert(season && episode, `Movie "${movie.id}" has no episodes`);
  return episode;
}

export function moviesInCategory(
  categoryId: string,
  genreId: string,
): ResolvedMovie[] {
  const category = resolved.categories.find(item => item.id === categoryId);
  assert(category, `Unknown category "${categoryId}"`);
  const movies = category.movieIds.map(movieId => getMovie(movieId));
  if (genreId === 'all') {
    return movies;
  }
  return movies.filter(movie => movie.genres.some(genre => genre.id === genreId));
}

export function resolvePlayback(
  movieId: string,
  seasonNumber: number,
  episodeNumber: number,
): PlaybackTarget {
  const movie = getMovie(movieId);
  const season = movie.seasons.find(item => item.number === seasonNumber);
  assert(season, `Movie "${movieId}" has no season ${seasonNumber}`);
  const episode = season.episodes.find(item => item.number === episodeNumber);
  assert(
    episode,
    `Movie "${movieId}" S${seasonNumber} has no episode ${episodeNumber}`,
  );
  return { movie, season, episode };
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatGenreLabels(items: readonly Genre[]): string {
  return items.map(genre => genre.label).join(copy.listSeparator);
}

/** Player and hero kicker: episode label, episode title, then genres. */
export function formatPlaybackKicker(
  movie: ResolvedMovie,
  episode: ResolvedEpisode,
): string {
  const parts = [episode.label];
  if (episode.title && episode.title !== episode.label) {
    parts.push(episode.title);
  }
  const genreLabel = formatGenreLabels(movie.genres);
  if (genreLabel) {
    parts.push(genreLabel);
  }
  return parts.join(copy.listSeparator);
}

export function heroSource(
  movie: ResolvedMovie,
): NonNullable<ResolvedMovie['hero']> {
  return movie.hero ?? movie.poster;
}
