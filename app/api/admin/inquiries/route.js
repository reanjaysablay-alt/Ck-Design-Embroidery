import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAccessAdmin, getAdminRole } from '@/lib/admin';
import { sendMail, inquiryReplyCustomerEmail } from '@/lib/email';
import { logActivity } from '@/lib/activityLog';

// Staff can triage inquiries too (mark read / delete / reply) — this
// is routine day-to-day work, not a full-admin-only action.
async function requireStaffOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessAdmin(user.email)) {
    throw new Error('Not authorized');
  }
  return user;
}

// Send (or overwrite) a reply to a message/feedback/quote inquiry.
// Emails the customer and stores the reply text + timestamp.
export async function POST(request) {
  try {
    const actor = await requireStaffOrAdmin();
    const { id, reply } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const replyText = (reply || '').trim();
    if (!replyText) return NextResponse.json({ error: 'Reply cannot be empty' }, { status: 400 });

    const admin = createAdminClient();
    const { data: inquiry, error: fetchError } = await admin
      .from('contact_inquiries')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { subject, html } = inquiryReplyCustomerEmail(inquiry, replyText);
    await sendMail({ to: inquiry.email, subject, html });

    const { error } = await admin
      .from('contact_inquiries')
      .update({ reply: replyText, replied_at: new Date().toISOString(), read: true })
      .eq('id', id);
    if (error) throw error;

    await logActivity({
      actorEmail: actor.email,
      actorRole: getAdminRole(actor.email),
      action: 'inquiry.reply',
      targetType: 'inquiry',
      targetId: id,
      details: `Replied to inquiry #${id} from ${inquiry.name}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Mark an inquiry as read.
export async function PATCH(request) {
  try {
    const actor = await requireStaffOrAdmin();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from('contact_inquiries')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;

    await logActivity({
      actorEmail: actor.email,
      actorRole: getAdminRole(actor.email),
      action: 'inquiry.read',
      targetType: 'inquiry',
      targetId: id,
      details: `Marked inquiry #${id} as read`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Delete an inquiry.
export async function DELETE(request) {
  try {
    const actor = await requireStaffOrAdmin();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from('contact_inquiries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity({
      actorEmail: actor.email,
      actorRole: getAdminRole(actor.email),
      action: 'inquiry.delete',
      targetType: 'inquiry',
      targetId: id,
      details: `Deleted inquiry #${id}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
