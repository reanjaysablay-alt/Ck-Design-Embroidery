# Stitchhouse — Admin dark theme + decoupling from site settings

## Status: REVERTED

The admin panel was converted to a professional dark theme, but has been
**reverted back to the normal/original admin design** per request.

- Removed the new admin sidebar/mobile-nav/page-header/sign-out components
- Removed the admin design-system CSS classes from `globals.css`
- Restored `app/admin/layout.js`, all admin pages, and admin form components
  to their original storefront-consistent styling (using `bg-canvas`,
  `text-thread`, `font-display`, `text-gold`, etc.)
- Restored `components/AdminHeader.jsx` to the original minimal admin top bar
