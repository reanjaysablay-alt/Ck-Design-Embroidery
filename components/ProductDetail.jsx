'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from './CartContext';
import { productImageSrc } from '@/lib/placeholder';

export default function ProductDetail({ product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes ? product.sizes[0] : null);
  const [type, setType] = useState('plain'); // 'plain' | 'custom'
  const [note, setNote] = useState('');
  const [design, setDesign] = useState(null); // { path, name } once uploaded
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | done | error
  const [uploadError, setUploadError] = useState('');
  const [added, setAdded] = useState(false);
  const outOfStock = product.inStock === false;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    setUploadError('');
    setDesign(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/design', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');
      setDesign({ path: result.path, name: result.name });
      setUploadStatus('done');
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err.message || 'Upload failed — please try again.');
    }
  }

  function handleAdd() {
    addItem(product, { size, type, note: note.trim(), design, qty: 1 });
    setAdded(true);
    setNote('');
    setDesign(null);
    setUploadStatus('idle');
    setUploadError('');
    setTimeout(() => setAdded(false), 1800);
  }

return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
<div className="relative aspect-[4/5] bg-canvas2 rounded-sm overflow-hidden">
        <Image src={productImageSrc(product.image)} alt={product.name} fill sizes="(max-width: 768px) 90vw, 38vw" className="object-cover" />
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">{product.category}</p>
        <h1 className="font-display text-4xl text-thread mb-4">{product.name}</h1>
        <p className="font-mono text-2xl text-thread mb-6">${product.price}</p>
        {outOfStock && (
          <p className="inline-block bg-stitchRed text-thread text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-sm mb-6">
            Out of Stock
          </p>
        )}
        <p className="text-thread/70 leading-relaxed mb-8">{product.description}</p>

        <dl className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div>
            <dt className="text-thread/40 uppercase tracking-widest text-xs mb-1">Stitch count</dt>
            <dd className="font-mono text-thread">{product.stitchCount}</dd>
          </div>
          <div>
            <dt className="text-thread/40 uppercase tracking-widest text-xs mb-1">Thread colors</dt>
            <dd className="text-thread">{product.threads?.join(', ')}</dd>
          </div>
        </dl>

        {product.sizes && (
          <div className="mb-8">
            <div className="text-thread/40 uppercase tracking-widest text-xs mb-2">Size</div>
            <div className="flex gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-4 py-2 text-sm border rounded-sm transition-colors ${
                    size === s
                      ? 'border-gold text-gold'
                      : 'border-white/20 text-thread/70 hover:border-white/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plain / Custom selection — required before adding to cart */}
        {!outOfStock && (
        <div className="mb-8">
          <div className="text-thread/40 uppercase tracking-widest text-xs mb-2">
            Make it custom?
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setType('plain')}
              className={`px-4 py-2 text-sm border rounded-sm transition-colors ${
                type === 'plain'
                  ? 'border-gold text-gold'
                  : 'border-white/20 text-thread/70 hover:border-white/40'
              }`}
            >
              Plain
            </button>
            <button
              onClick={() => setType('custom')}
              className={`px-4 py-2 text-sm border rounded-sm transition-colors ${
                type === 'custom'
                  ? 'border-gold text-gold'
                  : 'border-white/20 text-thread/70 hover:border-white/40'
              }`}
            >
              Custom
            </button>
          </div>
        </div>
        )}

        {!outOfStock && type === 'custom' && (
          <div className="mb-8">
            <label className="block text-thread/40 uppercase tracking-widest text-xs mb-2">
              Describe your design
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Tell us about your design — logo, text, colors, placement, or anything else we should know."
              className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
            />

            <label className="block text-thread/40 uppercase tracking-widest text-xs mb-2 mt-5">
              Upload your artwork (optional)
            </label>
            <input
              type="file"
              accept="image/*,.pdf,.ai,.eps,.svg,.psd"
              onChange={handleFileChange}
              className="w-full text-sm text-thread/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border file:border-white/15 file:bg-canvas2 file:text-thread file:text-xs file:uppercase file:tracking-widest file:cursor-pointer file:hover:border-white/40"
            />
            {uploadStatus === 'uploading' && (
              <p className="text-thread/40 text-xs mt-2">Uploading…</p>
            )}
            {uploadStatus === 'done' && design && (
              <p className="text-gold text-xs mt-2">✓ {design.name} attached</p>
            )}
            {uploadStatus === 'error' && (
              <p className="text-stitchRed text-xs mt-2">{uploadError}</p>
            )}
            <p className="text-thread/30 text-xs mt-2">
              Or skip this and email your artwork later — we'll follow up.
            </p>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={uploadStatus === 'uploading' || outOfStock}
          className="w-full md:w-auto bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {outOfStock
            ? 'Out of Stock'
            : added
            ? 'Added to Cart ✓'
            : uploadStatus === 'uploading'
            ? 'Uploading…'
            : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
