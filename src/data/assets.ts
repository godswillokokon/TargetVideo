import type { ImageSourcePropType } from 'react-native';

/**
 * Metro only bundles media referenced by a static require.
 * `assets/catalog.json` names these keys. Register a file here when one is added.
 */
const images: Record<string, ImageSourcePropType> = {
  hero: require('@assets/images/hero.png'),
  poster_1: require('@assets/images/poster_1.png'),
  poster_2: require('@assets/images/poster_2.png'),
  poster_3: require('@assets/images/poster_3.png'),
  poster_4: require('@assets/images/poster_4.png'),
  poster_5: require('@assets/images/poster_5.png'),
  poster_6: require('@assets/images/poster_6.png'),
};

const videos: Record<string, number> = {
  'naruto/s1e1': require('@assets/video/naruto/s1e1.mp4'),
};

export function imageFor(key: string): ImageSourcePropType {
  const source = images[key];
  if (!source) {
    throw new Error(`Unknown image asset "${key}"`);
  }
  return source;
}

export function videoFor(key: string): number {
  const source = videos[key];
  if (source == null) {
    throw new Error(`Unknown video asset "${key}"`);
  }
  return source;
}
