export const products = [
  {
    slug: 'wildflower-hoop-art',
    name: 'Wildflower Hoop Art',
    price: 48,
    category: 'Wall Art',
    image: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=800',
    description:
      'A hand-guided satin-stitch wildflower spray in a natural beechwood hoop, ready to hang. Each piece is stitched to order, so slight variation is part of the charm.',
    stitchCount: '18,400',
    threads: ['Moss green', 'Dusty rose', 'Cream'],
  },
  {
    slug: 'monogram-canvas-tote',
    name: 'Monogram Canvas Tote',
    price: 34,
    category: 'Bags',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800',
    description:
      'Heavyweight 12oz canvas tote with a three-letter monogram in block satin stitch. Sturdy enough for market runs, sharp enough for the office.',
    stitchCount: '6,200',
    threads: ['Gold', 'Navy'],
    sizes: ['One Size'],
  },
  {
    slug: 'oak-leaf-denim-jacket',
    name: 'Oak Leaf Denim Jacket',
    price: 128,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=800',
    description:
      'Raw denim trucker jacket with an oak leaf and branch design climbing the back panel. Stitched panel by panel before assembly for a clean, puckerâ€‘free finish.',
    stitchCount: '41,000',
    threads: ['Olive', 'Rust', 'Ochre'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    slug: 'terrier-portrait-patch',
    name: 'Terrier Portrait Patch',
    price: 16,
    category: 'Patches',
    image: 'https://images.unsplash.com/photo-1618335829737-2228915674e0?w=800',
    description:
      'Iron-on portrait patch, digitized from a reference photo. Send us a picture of your own dog and we will digitize a custom version.',
    stitchCount: '9,800',
    threads: ['Custom to reference photo'],
  },
  {
    slug: 'harbor-stripe-cap',
    name: 'Harbor Stripe Cap',
    price: 29,
    category: 'Hats',
    image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800',
    description:
      'Structured five-panel cap with a small anchor motif on the front panel and adjustable brass buckle at the back.',
    stitchCount: '4,100',
    threads: ['Navy', 'Gold'],
    sizes: ['One Size'],
  },
  {
    slug: 'linen-throw-pillow',
    name: 'Botanical Linen Pillow',
    price: 42,
    category: 'Home',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800',
    description:
      'Natural linen cover with a fern-frond border, hidden zip closure. Insert included.',
    stitchCount: '22,500',
    threads: ['Sage', 'Cream'],
  },
];

export function getProduct(slug) {
  return products.find((p) => p.slug === slug);
}
