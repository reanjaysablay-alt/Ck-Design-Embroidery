// A plain neutral placeholder so a product with no image URL never
// crashes next/image (which throws if given a null/undefined src).
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <rect width="800" height="1000" fill="#E4D9C4"/>
      <text x="400" y="500" font-family="sans-serif" font-size="28" fill="#1C1811" text-anchor="middle" opacity="0.4">No image yet</text>
    </svg>`
  );

export function productImageSrc(src) {
  return src && src.trim() ? src : PLACEHOLDER_IMAGE;
}
