import type { CollectionEntry } from "astro:content";
import { getPath } from "./getPathBlog";

export interface MapTalk {
  title: string;
  conference?: string;
  date: string;
  href: string;
  upcoming: boolean;
}

export interface MapMarker {
  latitude: number;
  longitude: number;
  location: string;
  talks: MapTalk[];
}

/**
 * Turns talks into map markers. Talks at the same venue (e.g. two talks at one
 * conference, or the same conference in different years) share one marker, so
 * no marker ends up hidden underneath another one.
 */
const getMapMarkers = (presentations: CollectionEntry<"blog">[]) => {
  const markers = new Map<string, MapMarker>();
  const seen = new Set<string>();

  presentations.forEach(({ id, filePath, data }) => {
    if (seen.has(id)) return;
    seen.add(id);
    const { conferenceLat: latitude, conferenceLong: longitude } = data;
    if (latitude == null || longitude == null) return;

    // ~100m precision: close enough to count as the same venue.
    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    const marker = markers.get(key) ?? {
      latitude,
      longitude,
      location: data.conferenceVenue
        ? `${data.conferenceVenue}, ${data.conferenceLocation}`
        : (data.conferenceLocation ?? data.conference ?? data.title),
      talks: [],
    };

    const date = data.conferenceDate ?? data.pubDatetime;
    marker.talks.push({
      title: data.title,
      conference: data.conference,
      date: date.toISOString(),
      href: getPath(id, filePath),
      upcoming: date.getTime() > Date.now(),
    });
    markers.set(key, marker);
  });

  // West → east, so keyboard focus moves across the map in reading order.
  return [...markers.values()]
    .sort((a, b) => a.longitude - b.longitude)
    .map(marker => ({
      ...marker,
      talks: marker.talks.sort((a, b) => b.date.localeCompare(a.date)),
    }));
};

export default getMapMarkers;
