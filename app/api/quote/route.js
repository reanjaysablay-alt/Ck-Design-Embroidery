import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMail, newInquiryAdminEmail } from '@/lib/email';

// Accepts business quote requests from the quote form. Stores them in
// the contact_inquiries table (type='quote') and sends an email to the
// admin so they never miss a lead.
export async function POST(request) {
  const data = await request.json();

  if (!data.name || !data.email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Build a rich message from the form fields.
    const details = [
      `Company: ${data.company || 'N/A'}`,
      `Phone: ${data.phone || 'N/A'}`,
      `Estimated quantity: ${data.quantity || 'Not specified'}`,
      `Garment type(s): ${data.garmentType || 'Not specified'}`,
      ``,
      `Project details:`,
      data.details || 'Not provided',
    ].join('\n');

    const { data: inquiry, error } = await admin
      .from('contact_inquiries')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        type: 'quote',
        subject: `Quote request from ${data.name}${data.company ? ` — ${data.company}` : ''}`,
        message: details,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Notify the admin by email.
    if (process.env.ADMIN_EMAILS) {
      const { subject, html } = newInquiryAdminEmail(inquiry);
      await sendMail({ to: process.env.ADMIN_EMAILS.split(',')[0].trim(), subject, html });
    }

    return NextResponse.json({ ok: true, id: inquiry.id });
  } catch (err) {
    console.error('Quote request error:', err);
    return NextResponse.json({ error: 'Could not save your request. Please try again.' }, { status: 500 });
  }
}
