import {
  categories,
  formatPlaybackKicker,
  genres,
  getFeaturedMovie,
  moviesInCategory,
  openingEpisode,
  resolvePlayback,
} from '@/data/catalog';

describe('catalog', () => {
  it('resolves the featured movie as season then episode', () => {
    const movie = getFeaturedMovie();
    expect(movie.title).toBe('Naruto');
    expect(movie.rating).toBe(4.8);
    expect(movie.genres.map(genre => genre.id)).toEqual(['anime']);

    const episode = openingEpisode(movie);
    expect(episode.seasonNumber).toBe(1);
    expect(episode.number).toBe(1);
    expect(episode.label).toBe('Ep 1');
    expect(episode.title).toBe("Minato's Farewell");
    expect(episode.videoKey).toBe('naruto/s1e1');
    expect(episode.videoSource).toEqual(
      expect.objectContaining({
        testUri: expect.stringContaining('naruto/s1e1.mp4'),
      }),
    );
    expect(episode.cliffRatio).toBe(0.2);
    expect(formatPlaybackKicker(movie, episode)).toBe(
      "Ep 1 · Minato's Farewell · Anime",
    );
  });

  it('reads genres and category shelves from the catalog', () => {
    expect(genres.map(genre => genre.id)).toEqual([
      'romance',
      'action',
      'fantasy',
      'thriller',
      'anime',
    ]);
    expect(categories.map(category => category.title)).toEqual([
      'Trending Romance',
      'Popular Micro Dramas',
    ]);

    expect(moviesInCategory('trending', 'anime').map(movie => movie.id)).toEqual([
      'naruto',
    ]);
    expect(moviesInCategory('popular', 'all')).toHaveLength(4);
    expect(moviesInCategory('popular', 'fantasy')).toEqual([]);
  });

  it('resolves a playback target and leaves episodes without a file unplayable', () => {
    const playable = resolvePlayback('naruto', 1, 1);
    expect(playable.season.number).toBe(1);
    expect(playable.episode.title).toBe("Minato's Farewell");
    expect(playable.episode.videoSource).toEqual(
      expect.objectContaining({
        testUri: expect.stringContaining('naruto/s1e1.mp4'),
      }),
    );

    const missing = resolvePlayback('neon-vow', 1, 1);
    expect(missing.movie.title).toBe('Neon Vow');
    expect(missing.episode.videoSource).toBeNull();
    expect(missing.episode.cliffRatio).toBeNull();
  });
});
