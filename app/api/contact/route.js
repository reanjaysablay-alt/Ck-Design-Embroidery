import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMail, newInquiryAdminEmail } from '@/lib/email';

// Accepts contact form submissions, feedback, and ratings from the
// public contact page. Stores them in the contact_inquiries table
// and sends an email to the admin.
export async function POST(request) {
  const { name, email, phone, type, subject, message, rating } = await request.json();

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  // The comment is optional for ratings — everything else needs a message.
  if (type !== 'rating' && !message) {
    return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
  }

  if (type === 'rating' && (!rating || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
  }

  if (!['message', 'feedback', 'rating', 'quote'].includes(type)) {
    return NextResponse.json({ error: 'Invalid inquiry type.' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const { data: inquiry, error } = await admin
      .from('contact_inquiries')
      .insert({
        name,
        email,
        phone: phone || null,
        type,
        subject: subject || null,
        message: message || '',
        rating: rating || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Mirror ratings into the public ratings table so they show up on the
    // site in realtime. Public-safe fields only — no email/phone.
    if (type === 'rating' && rating) {
      const { error: ratingError } = await admin
        .from('ratings')
        .insert({
          name,
          rating,
          comment: message || null,
          source_id: inquiry.id,
        });
      if (ratingError) {
        console.error('Public ratings insert failed:', ratingError.message);
      }
    }

    // Notify the admin by email.
    if (process.env.ADMIN_EMAILS) {
      const { subject: emailSubject, html } = newInquiryAdminEmail(inquiry);
      await sendMail({ to: process.env.ADMIN_EMAILS.split(',')[0].trim(), subject: emailSubject, html });
    }

    return NextResponse.json({ ok: true, id: inquiry.id });
  } catch (err) {
    console.error('Contact inquiry error:', err);
    return NextResponse.json({ error: 'Could not save your message. Please try again.' }, { status: 500 });
  }
}
