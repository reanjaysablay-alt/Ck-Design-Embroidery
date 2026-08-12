-- Run this AFTER schema.sql, in the Supabase SQL editor, to populate the
-- shop with starter products. Edit freely, or skip this and add products
-- through the admin dashboard instead (/admin/products/new).

insert into public.products (slug, name, price, category, image, description, stitch_count, threads, sizes)
values
  (
    'wildflower-hoop-art', 'Wildflower Hoop Art', 48, 'Wall Art',
    'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=800',
    'A hand-guided satin-stitch wildflower spray in a natural beechwood hoop, ready to hang. Each piece is stitched to order, so slight variation is part of the charm.',
    '18,400', array['Moss green', 'Dusty rose', 'Cream'], null
  ),
  (
    'monogram-canvas-tote', 'Monogram Canvas Tote', 34, 'Bags',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800',
    'Heavyweight 12oz canvas tote with a three-letter monogram in block satin stitch. Sturdy enough for market runs, sharp enough for the office.',
    '6,200', array['Gold', 'Navy'], array['One Size']
  ),
  (
    'oak-leaf-denim-jacket', 'Oak Leaf Denim Jacket', 128, 'Apparel',
    'https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=800',
    'Raw denim trucker jacket with an oak leaf and branch design climbing the back panel. Stitched panel by panel before assembly for a clean, pucker-free finish.',
    '41,000', array['Olive', 'Rust', 'Ochre'], array['S', 'M', 'L', 'XL']
  ),
  (
    'terrier-portrait-patch', 'Terrier Portrait Patch', 16, 'Patches',
    'https://images.unsplash.com/photo-1618335829737-2228915674e0?w=800',
    'Iron-on portrait patch, digitized from a reference photo. Send us a picture of your own dog and we will digitize a custom version.',
    '9,800', array['Custom to reference photo'], null
  ),
  (
    'harbor-stripe-cap', 'Harbor Stripe Cap', 29, 'Hats',
    'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800',
    'Structured five-panel cap with a small anchor motif on the front panel and adjustable brass buckle at the back.',
    '4,100', array['Navy', 'Gold'], array['One Size']
  )
on conflict (slug) do nothing;
