import { VIDEO_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";

/**
 * Get full path of a video post
 * @param id - id of the video post (aka slug)
 * @param filePath - the video post full file location
 * @param includeBase - whether to include `/presentations` in return value
 * @returns video post path
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true
) {
  const pathSegments = filePath
    ?.replace(VIDEO_PATH, "")
    .split("/")
    .filter(path => path !== "") // remove empty string in the segments ["", "other-path"] <- empty string will be removed
    .filter(path => !path.startsWith("_")) // exclude directories start with underscore "_"
    .slice(0, -1) // remove the last segment_ file name_ since it's unnecessary
    .map(segment => slugifyStr(segment)); // slugify each segment path

  const basePath = includeBase ? "/videos" : "";

  // Making sure `id` does not contain the directory
  const videoId = id.split("/");
  const slug = videoId.length > 0 ? videoId.slice(-1) : videoId;

  // If not inside the sub-dir, simply return the file path
  if (!pathSegments || pathSegments.length < 1) {
    return [basePath, slug].join("/");
  }

  return [basePath, ...pathSegments, slug].join("/");
}
