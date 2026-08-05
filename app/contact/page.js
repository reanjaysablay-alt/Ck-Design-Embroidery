'use client';

import { useState } from 'react';
import Link from 'next/link';
import RatingsSection from '@/components/RatingsSection';

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState('message'); // message | feedback | rating
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    rating: 5,
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    const payload = {
      ...formData,
      type: activeTab,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('sent');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '', rating: 5 });
    } catch (err) {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-20 text-center">
        <div className="bg-canvas2 border border-gold/30 rounded-sm p-10">
          <h2 className="font-display text-3xl text-thread mb-4">
            {activeTab === 'rating' ? 'Thank you for your feedback! ⭐' : 'Message received'}
          </h2>
          <p className="text-thread/60 mb-6">
            {activeTab === 'rating'
              ? 'We appreciate your rating — it helps us keep improving.'
              : "We'll get back to you as soon as possible."}
          </p>
          <button
            onClick={() => { setStatus('idle'); setActiveTab('message'); }}
            className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-7 py-3.5 rounded-sm hover:bg-thread transition-colors"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">Contact</p>
      <h1 className="font-display text-4xl md:text-5xl text-thread mb-8">Get in touch</h1>

      {/* Contact info */}
      <div className="bg-canvas2 border border-white/5 rounded-sm p-6 mb-10 space-y-3 text-thread/80 leading-relaxed">
        <p className="font-mono text-xs uppercase tracking-widest text-gold mb-2">Studio</p>
        <p className="font-display text-lg text-thread">CK Design Embroidery</p>
        <p>
          📍 Shabiya 10, Abu Dhabi, UAE
        </p>
        <p>
          <WhatsAppIcon />{' '}
          <a
            href="https://wa.me/971508249957"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            +971 50 824 9957
          </a>
        </p>
        <p>
          ✉️{' '}
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=adminacc0935@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            adminacc0935@gmail.com
          </a>
        </p>
        <p className="text-thread/50 text-sm">🕐 Studio hours: Sat–Thu, 9am–6pm</p>
      </div>

      {/* Tabs: Message / Feedback / Rating */}
      <div className="flex gap-3 mb-8 border-b border-white/10 pb-4">
        {[
          { key: 'message', label: 'Send a Message' },
          { key: 'feedback', label: 'Feedback' },
          { key: 'rating', label: 'Rate Us ⭐' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setStatus('idle'); }}
            className={`text-sm uppercase tracking-widest pb-2 transition-colors ${
              activeTab === tab.key
                ? 'text-gold border-b-2 border-gold'
                : 'text-thread/50 hover:text-thread/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Your name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
          <Field label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} required />
        </div>
        <Field label="Phone (optional)" type="tel" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />

        {activeTab !== 'rating' && (
          <Field label="Subject" value={formData.subject} onChange={(v) => setFormData({ ...formData, subject: v })} />
        )}

        {activeTab === 'rating' ? (
          <div>
            <label className="block text-xs uppercase tracking-widest text-thread/50 mb-3">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className={`text-2xl transition-colors ${
                    star <= formData.rating ? 'text-gold' : 'text-thread/20'
                  }`}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            <label className="block text-xs uppercase tracking-widest text-thread/50 mt-4 mb-2">
              Your review (optional)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              placeholder="Tell us what you think..."
              className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={5}
              required
              placeholder={
                activeTab === 'feedback'
                  ? 'Share your feedback, suggestions, or ideas with us...'
                  : 'How can we help you?'
              }
              className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
        >
          {status === 'sending'
            ? 'Sending…'
            : activeTab === 'rating'
              ? 'Submit Rating'
              : activeTab === 'feedback'
                ? 'Send Feedback'
                : 'Send Message'}
        </button>

        {status === 'error' && (
          <p className="text-stitchRed text-sm">
            Something went wrong — please try again or email us directly.
          </p>
        )}
      </form>

<p className="text-thread/50 text-sm mt-10">
        Have a business order in mind?{' '}
        <Link href="/quote" className="text-gold hover:underline">
          Use the quote form
        </Link>{' '}
        instead — it gets you a faster response.
      </p>

      {/* Public ratings feed — live star scores + full list, updated in
          realtime as clients rate us. */}
      <RatingsSection />
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
      />
    </div>
  );
}

// WhatsApp brand icon (inline SVG, matches the rest of the icon set).
function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="inline-block align-text-bottom text-green-400" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
