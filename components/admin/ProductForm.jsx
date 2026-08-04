export default function ProductForm({ product, action, submitLabel }) {
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
        <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
          Product Image
        </label>
        {product?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt=""
            className="w-32 h-32 object-cover rounded-sm mb-3 border border-white/10"
          />
        )}
        <input
          type="file"
          name="imageFile"
          accept="image/*"
          required={!product?.image}
          className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:bg-gold file:text-ink file:text-xs file:uppercase file:tracking-widest focus-visible:outline-gold"
        />
        {product?.image && (
          <>
            <input type="hidden" name="existingImage" value={product.image} />
            <p className="text-thread/40 text-xs mt-2">Leave blank to keep the current image.</p>
          </>
        )}
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">Description</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description}
          className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold"
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

      <button
        type="submit"
        className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-3.5 rounded-sm hover:bg-thread transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({ label, name, defaultValue, type = 'text', step, required }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">{label}</label>
      <input
        type={type}
        name={name}
        step={step}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold"
      />
    </div>
  );
}
