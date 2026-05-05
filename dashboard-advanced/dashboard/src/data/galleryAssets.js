import galleryManifest from "../../../../shared/assets/images/image_gallery/gallery-manifest.json";

const imageModules = import.meta.glob(
  "../../../../shared/assets/images/image_gallery/*.{webp,jpg,jpeg,png}",
  { eager: true, query: "?url", import: "default" }
);

const imageUrlByFilename = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => [path.split("/").pop(), url])
);

export const sharedGalleryImages = galleryManifest
  .map((image) => ({
    ...image,
    src: imageUrlByFilename[image.filename],
  }))
  .filter((image) => image.src);
