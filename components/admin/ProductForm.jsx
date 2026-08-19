'use client';

import { useState, useRef, useEffect } from 'react';

// Automatic background removal for product images. Runs entirely in the
// browser via @imgly/background-removal (WASM), so no external API key or
// paid service is needed. When the admin picks an image, it is processed
// to a transparent-background PNG before being submitted to the server
// action, which then uploads the cleaned image to Supabase Storage.
export default function ProductForm({ product, action, submitLabel }) {
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(product?.image || null);
  const [processedFile, setProcessedFile] = useState(null);
  const [originalName, setOriginalName] = useState('');

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
        <Field label="Price (USD)" name="price" type="number" step="0.01" defaultValue={product?.price} required />
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
        defaultValue={product?.sizes?.join(', ')}
      />

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
        Out-of-stock products stay visible in the shop with an "Out of Stock" label, but customers can't add them to their cart.
      </p>

      <button
        type="submit"
        disabled={processing}
        className="bg-indigo-600 text-white font-medium text-sm px-8 py-3.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-60"
      >
        {processing ? 'Processing image…' : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, name, defaultValue, type = 'text', step, required }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">{label}</label>
      <input
        type={type}
        name={name}
        step={step}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus-visible:outline-indigo-500"
      />
    </div>
  );
}
