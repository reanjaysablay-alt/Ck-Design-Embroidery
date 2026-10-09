'use client';

import {
createContext,
useContext,
useEffect,
useMemo,
useState,
} from 'react';

const CartContext = createContext(undefined);

const STORAGE_KEY = 'stitchhouse-cart';

function normalizeItem(item) {
if (!item || typeof item !== 'object') {
return null;
}

const slug = String(item.slug || '').trim();

if (!slug) {
return null;
}

const qty = Math.max(
1,
Math.floor(
Number(item.qty) || 1
)
);

const price = Math.max(
0,
Number(item.price) || 0
);

const type =
item.type === 'custom'
? 'custom'
: 'plain';

const design =
item.design &&
typeof item.design === 'object' &&
item.design.path
? {
path: String(
item.design.path
),
name: String(
item.design.name ||
item.design.path
),
}
: null;

return {
key:
String(item.key || '').trim() ||
[
slug,
item.size || 'onesize',
type,
item.note || '',
design?.path || '',
].join('-'),


slug,

name:
  String(item.name || '').trim() ||
  slug,

price,

image:
  item.image || null,

size:
  item.size
    ? String(item.size)
    : null,

type,

note:
  String(item.note || '').trim(),

design,

qty,


};
}

function loadStoredCart() {
if (
typeof window === 'undefined'
) {
return [];
}

try {
const saved =
window.localStorage.getItem(
STORAGE_KEY
);


if (!saved) {
  return [];
}

const parsed =
  JSON.parse(saved);

if (!Array.isArray(parsed)) {
  return [];
}

return parsed
  .map(normalizeItem)
  .filter(Boolean);


} catch (error) {
console.error(
'Failed to load cart:',
error
);


return [];


}
}

export function CartProvider({
children,
}) {
const [items, setItems] =
useState([]);

const [hydrated, setHydrated] =
useState(false);

useEffect(() => {
const storedCart =
loadStoredCart();


setItems(storedCart);

setHydrated(true);


}, []);

useEffect(() => {
if (!hydrated) {
return;
}


try {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(items)
  );
} catch (error) {
  console.error(
    'Failed to save cart:',
    error
  );
}


}, [items, hydrated]);

function addItem(
product,
options = {}
) {
if (!product) {
console.error(
'Cannot add an empty product to cart.'
);


  return;
}

const slug =
  String(
    product.slug || ''
  ).trim();

if (!slug) {
  console.error(
    'Cannot add product without a slug.'
  );

  return;
}

const qty = Math.max(
  1,
  Math.floor(
    Number(options.qty) || 1
  )
);

const type =
  options.type === 'custom'
    ? 'custom'
    : 'plain';

const note =
  String(
    options.note || ''
  ).trim();

const design =
  options.design &&
  typeof options.design ===
    'object' &&
  options.design.path
    ? {
        path: String(
          options.design.path
        ),

        name: String(
          options.design.name ||
            options.design.path
        ),
      }
    : null;

const size =
  options.size
    ? String(options.size)
    : null;

const key = [
  slug,
  size || 'onesize',
  type,
  note,
  design?.path || '',
].join('-');

setItems((currentItems) => {
  const existing =
    currentItems.find(
      (item) =>
        item.key === key
    );

  if (existing) {
    return currentItems.map(
      (item) =>
        item.key === key
          ? {
              ...item,

              qty:
                Number(
                  item.qty || 0
                ) + qty,
            }
          : item
    );
  }

  return [
    ...currentItems,

    {
      key,

      slug,

      name:
        String(
          product.name || ''
        ).trim() ||
        slug,

      price: Math.max(
        0,
        Number(
          product.price
        ) || 0
      ),

      image:
        product.image ||
        null,

      size,

      type,

      note,

      design,

      qty,
    },
  ];
});


}

function removeItem(key) {
if (!key) {
return;
}


setItems(
  (currentItems) =>
    currentItems.filter(
      (item) =>
        item.key !== key
    )
);


}

function updateQty(
key,
qty
) {
if (!key) {
return;
}


const newQty = Math.floor(
  Number(qty)
);

if (
  !Number.isFinite(
    newQty
  ) ||
  newQty < 1
) {
  removeItem(key);
  return;
}

setItems(
  (currentItems) =>
    currentItems.map(
      (item) =>
        item.key === key
          ? {
              ...item,
              qty: newQty,
            }
          : item
    )
);


}

function clearCart() {
setItems([]);
}

const subtotal = useMemo(
() =>
items.reduce(
(sum, item) =>
sum +
Math.max(
0,
Number(
item.price
) || 0
) *
Math.max(
0,
Number(
item.qty
) || 0
),
0
),
[items]
);

const count = useMemo(
() =>
items.reduce(
(sum, item) =>
sum +
Math.max(
0,
Number(
item.qty
) || 0
),
0
),
[items]
);

const value = useMemo(
() => ({
items,


  addItem,

  removeItem,

  updateQty,

  clearCart,

  subtotal,

  count,

  hydrated,
}),
[
  items,
  subtotal,
  count,
  hydrated,
]


);

return (
<CartContext.Provider
value={value}
>
{children}
</CartContext.Provider>
);
}

export function useCart() {
const context =
useContext(CartContext);

if (context === undefined) {
throw new Error(
'useCart must be used within CartProvider. Make sure your root layout is wrapped with <CartProvider>.'
);
}

return context;
}
