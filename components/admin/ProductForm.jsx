'use client';

import { useState, useRef, useEffect } from 'react';

// Automatic background removal for product images. Runs entirely in the
// browser via @imgly/background-removal (WASM), so no external API key or
// paid service is needed. When the admin picks an image, it is processed
// to a transparent-background PNG before being submitted to the server
// action, which then uploads the cleaned image to Supabase Storage.
export default function ProductForm({ product, action, submitLabel }) {
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(product?.image || null);
  const [processedFile, setProcessedFile] = useState(null);
  const [originalName, setOriginalName] = useState('');

  // Sizes is tracked in state (not just a defaultValue) so the stock
  // quantity inputs below can regenerate live as the admin types —
  // add "XXL" and a quantity field for it shows up immediately.
  const [sizesInput, setSizesInput] = useState(product?.sizes?.join(', ') || '');
  const sizeList = sizesInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // File input that holds the processed (background-removed) image.
  const processedInputRef = useRef(null);

  // Keep an object URL for the live preview so the admin sees the result.
  useEffect(() => {
    if (!processedFile) return;
    const url = URL.createObjectURL(processedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [processedFile]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setProcessingError('');
    setOriginalName(file.name);

    // Show the original immediately while processing runs.
    setPreviewUrl(URL.createObjectURL(file));

    try {
      // Load the background-removal library at runtime from a CDN instead
      // of bundling it. The npm package pulls in onnxruntime-web which
      // ships large WASM files that cause webpack to fail during `next
      // build` ("failed to parse input file"). Importing from a full URL
      // keeps webpack away from those assets entirely.
      const { removeBackground } = await import(
        /* webpackIgnore: true */
        'https://esm.sh/@imgly/background-removal@1.7.0'
      );

      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          // Optional: log progress for debugging.
          // console.log(`Processing ${key}: ${current}/${total}`);
        },
      });

      // Convert the resulting Blob into a File with a .png name so the
      // server action can upload it.
      const pngFile = new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}-nobg.png`, {
        type: 'image/png',
      });
      setProcessedFile(pngFile);

      // Store the processed file in the hidden input so the form
      // submission (server action) picks it up.
      const dt = new DataTransfer();
      dt.items.add(pngFile);
      processedInputRef.current.files = dt.files;
    } catch (err) {
      console.error('Background removal failed:', err);
      setProcessingError(
        'Background removal could not run in this browser. The original image will be used instead.'
      );
      // Fall back to the original file so the admin can still add the product.
      const dt = new DataTransfer();
      dt.items.add(file);
      processedInputRef.current.files = dt.files;
      setProcessedFile(file);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form action={action} className="space-y-6 max-w-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Name" name="name" defaultValue={product?.name} required />
        <Field
          label="Slug (URL, unique, no spaces)"
          name="slug"
          defaultValue={product?.slug}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label={'Price (\u20C3)'} name="price" type="number" step="0.01" defaultValue={product?.price} required />
        <Field label="Category" name="category" defaultValue={product?.category} />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
          Product Image
        </label>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="w-32 h-32 object-cover rounded-xl mb-3 border border-slate-200 bg-white"
          />
        )}

        <input
          type="file"
          name="imageFileOriginal"
          accept="image/*"
          required={!product?.image}
          onChange={handleFileChange}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:uppercase file:tracking-widest focus-visible:outline-indigo-500"
        />

        {/* Hidden input carrying the background-removed file to the server action */}
        <input type="file" name="imageFile" ref={processedInputRef} className="hidden" />

        {product?.image && (
          <>
            <input type="hidden" name="existingImage" value={product.image} />
            <p className="text-slate-400 text-xs mt-2">Leave blank to keep the current image.</p>
          </>
        )}

        {processing && (
          <p className="text-indigo-600 text-sm mt-3 flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Removing background… (this may take a few seconds)
          </p>
        )}
        {processingError && (
          <p className="text-red-600 text-sm mt-3">{processingError}</p>
        )}
        {!processing && processedFile && !processingError && (
          <p className="text-green-400 text-sm mt-3">
            ✓ Background removed — the image above will be uploaded.
          </p>
        )}
      </div>

      <ViewsEditor initial={product?.images} onBusyChange={setGalleryBusy} />

      <div>
        <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">Description</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus-visible:outline-indigo-500"
        />
      </div>

      <Field label="Stitch count" name="stitchCount" defaultValue={product?.stitchCount} />
      <Field
        label="Thread colors (comma-separated)"
        name="threads"
        defaultValue={product?.threads?.join(', ')}
      />
      <Field
        label="Sizes (comma-separated, leave blank if not sized)"
        name="sizes"
        value={sizesInput}
        onChange={setSizesInput}
      />

      {sizeList.length > 0 && (
        <div>
          <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
            Stock per size
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sizeList.map((size) => (
              <div key={size}>
                <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                  {size}
                </label>
                <input
                  type="number"
                  name={`stock_${size}`}
                  min="0"
                  step="1"
                  defaultValue={product?.stock?.[size] ?? ''}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus-visible:outline-indigo-500"
                />
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs mt-2">
            Customers will see exactly how many of each size are left on the product page.
            A size shows as sold out once its quantity hits 0.
          </p>
        </div>
      )}

      <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer w-fit">
        <input
          type="checkbox"
          name="outOfStock"
          defaultChecked={product ? !product.inStock : false}
          className="w-4 h-4 accent-red-600"
        />
        <span className="text-sm text-slate-700">
          Mark as <span className="text-red-600">Out of Stock</span>
        </span>
      </label>
      <p className="text-slate-400 text-xs -mt-4">
        {sizeList.length > 0
          ? 'Overrides the per-size stock above — use this to force the whole product unavailable regardless of quantities (e.g. discontinued).'
          : "Out-of-stock products stay visible in the shop with an \"Out of Stock\" label, but customers can't add them to their cart."}
      </p>

      <button
        type="submit"
        disabled={processing || galleryBusy}
        className="bg-indigo-600 text-white font-medium text-sm px-8 py-3.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-60"
      >
        {processing ? 'Processing image…' : galleryBusy ? 'Uploading views…' : submitLabel}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------
// Extra product views (side, back, detail...). The main image above is
// shown to customers as the "Front view"; everything added here appears
// next to it as clickable thumbnails on the product page.
// Each photo is shrunk in the browser and uploaded on its own as soon as
// it is chosen (a single big form submit would exceed Vercel's request
// limit), then only the URLs + labels travel with the form.
// ---------------------------------------------------------------------
const MAX_VIEWS = 8;
const VIEW_SUGGESTIONS = ['Side view', 'Back view', 'Detail', 'Close-up', 'Left side', 'Right side'];

async function shrinkImage(file) {
  try {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}

function ViewsEditor({ initial, onBusyChange }) {
  const [items, setItems] = useState(() =>
    (initial || []).map((v, i) => ({ key: `old-${i}`, url: v.url, label: v.label || '', status: 'done' }))
  );
  const fileRef = useRef(null);
  const counter = useRef(0);

  const busy = items.some((i) => i.status === 'uploading');
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  function patch(key, changes) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...changes } : i)));
  }

  function nextDefaultLabel(existing) {
    const used = new Set(existing.map((i) => i.label.trim().toLowerCase()));
    const pick = VIEW_SUGGESTIONS.slice(0, 3).find((l) => !used.has(l.toLowerCase()));
    return pick || `View ${existing.length + 2}`;
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const room = MAX_VIEWS - items.length;
    const chosen = files.slice(0, Math.max(room, 0));

    // Add placeholder rows first so the admin sees them straight away.
    let working = [...items];
    const added = chosen.map((file) => {
      counter.current += 1;
      const row = {
        key: `new-${counter.current}`,
        url: '',
        preview: URL.createObjectURL(file),
        label: nextDefaultLabel(working),
        status: 'uploading',
        file,
      };
      working = [...working, row];
      return row;
    });
    setItems(working);

    for (const row of added) {
      try {
        const small = await shrinkImage(row.file);
        const body = new FormData();
        body.append('file', small);
        const res = await fetch('/api/admin/product-image', { method: 'POST', body });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || 'Upload failed');
        patch(row.key, { url: result.url, status: 'done', error: '' });
      } catch (err) {
        patch(row.key, { status: 'error', error: err.message || 'Upload failed' });
      }
    }
  }

  function move(index, dir) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(key) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const payload = JSON.stringify(
    items.filter((i) => i.status === 'done').map((i) => ({ url: i.url, label: i.label.trim() }))
  );

  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
        More views (side, back, detail…)
      </label>
      <p className="text-slate-400 text-xs mb-3">
        The main image above is shown to customers as the <strong>Front view</strong>. Add the other
        angles here — customers can click each one on the product page. Up to {MAX_VIEWS}.
      </p>

      <input type="hidden" name="galleryJson" value={payload} />
      <datalist id="view-suggestions">
        {VIEW_SUGGESTIONS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      {items.length > 0 && (
        <ul className="space-y-3 mb-4">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview || item.url}
                alt=""
                className="w-16 h-16 object-cover rounded-lg border border-slate-200 bg-white flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  list="view-suggestions"
                  value={item.label}
                  maxLength={40}
                  onChange={(e) => patch(item.key, { label: e.target.value })}
                  placeholder="Label, e.g. Side view"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus-visible:outline-indigo-500"
                />
                {item.status === 'uploading' && (
                  <p className="text-indigo-600 text-xs mt-1">Uploading…</p>
                )}
                {item.status === 'error' && (
                  <p className="text-red-600 text-xs mt-1">
                    {item.error} — remove it and try again.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move down"
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  aria-label="Remove this view"
                  className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length < MAX_VIEWS && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:uppercase file:tracking-widest focus-visible:outline-indigo-500"
        />
      )}
    </div>
  );
}

function Field({ label, name, defaultValue, value, onChange, type = 'text', step, required }) {
  const isControlled = value !== undefined;
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">{label}</label>
      <input
        type={type}
        name={name}
        step={step}
        {...(isControlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : { defaultValue: defaultValue ?? '' })}
        required={required}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus-visible:outline-indigo-500"
      />
    </div>
  );
}
