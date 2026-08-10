import nodemailer from 'nodemailer';
import { getSiteSettings } from '@/lib/settings';
import { getDesignDownloadUrl, getDesignFileBuffer } from '@/lib/upload';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error(
      'Email is not configured — set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local'
    );
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

// Resolves the "From" display name shown in the customer's inbox.
// Priority: GMAIL_FROM_NAME env var → admin-editable site title →
// "Stitchhouse" fallback.
export async function getSenderName() {
  if (process.env.GMAIL_FROM_NAME) return process.env.GMAIL_FROM_NAME;
  try {
    const settings = await getSiteSettings();
    return settings.site_title || 'CK Design Embroidery';
  } catch {
    return 'CK Design Embroidery';
  }
}

// Never throws — email is a nice-to-have notification, not something
// that should break a checkout or an admin action if it fails to send.
export async function sendMail({ to, subject, html, fromName, attachments }) {
  try {
    await sendMailStrict({ to, subject, html, fromName, attachments });
    return true;
  } catch (err) {
    console.error('sendMail failed:', err.message);
    return false;
  }
}

// Throws on failure so callers can surface the real reason (e.g. the
// OTP flow needs to know if the email actually went out).
export async function sendMailStrict({ to, subject, html, fromName, attachments }) {
  const t = getTransporter();
  const name = fromName || (await getSenderName());
  await t.sendMail({
    from: `${name} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    ...(attachments?.length ? { attachments } : {}),
  });
}

// Builds the "new order" admin notification email. For custom items
// with an uploaded design file, this both (a) attaches the file
// directly to the email, and (b) includes a signed download link, so
// the admin has the artwork in their inbox even if the attachment is
// stripped by their mail client. Async because generating the signed
// link and reading the file bytes both hit Supabase Storage.
export async function newOrderAdminEmail(order) {
  const attachments = [];

  const itemsHtml = (
    await Promise.all(
      (order.items || []).map(async (i) => {
        const type = i.type === 'custom' ? 'Custom' : 'Plain';
        const note = i.type === 'custom' && i.note ? `<br/><em>Design note: ${i.note}</em>` : '';

        let designHtml = '';
        if (i.type === 'custom' && i.design?.path) {
          try {
            const [url, buffer] = await Promise.all([
              getDesignDownloadUrl(i.design.path),
              getDesignFileBuffer(i.design.path),
            ]);
            attachments.push({ filename: i.design.name || 'design-file', content: buffer });
            designHtml = `<br/><a href="${url}">📎 Download design file (${i.design.name})</a>`;
          } catch (err) {
            console.error('Could not attach design file:', err.message);
            designHtml = `<br/><em>Design file uploaded but couldn't be attached — check the admin dashboard.</em>`;
          }
        }

        return `<li>${i.name} [${type}] ${i.size ? `(${i.size})` : ''} × ${i.qty} — $${(i.price * i.qty).toFixed(2)}${note}${designHtml}</li>`;
      })
    )
  ).join('');

  return {
    subject: `New order #${order.id} — ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'PayPal (paid)'}`,
    html: `
      <h2>New order #${order.id}</h2>
      <p><strong>Customer:</strong> ${order.customer_email}</p>
      <p><strong>Payment:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'PayPal — paid'}</p>
      <p><strong>Total:</strong> $${order.total} ${order.currency}</p>
      <p><strong>Shipping to:</strong><br/>
        ${order.shipping_address?.fullName}<br/>
        ${order.shipping_address?.line1}<br/>
        ${order.shipping_address?.city}, ${order.shipping_address?.emirate}<br/>
        ${order.shipping_address?.phone}
      </p>
      <p><strong>Items:</strong></p>
      <ul>${itemsHtml}</ul>
      <p>Review and accept/decline this order in the admin dashboard.</p>
    `,
    attachments,
  };
}

export function orderAcceptedCustomerEmail(order) {
  return {
    subject: `✅ Your CK Design Embroidery order #${order.id} has been ACCEPTED`,
    html: `
      <h2 style="color:#1c1811">🎉 Your order has been accepted!</h2>
      <p>Great news — we've accepted your order and it's now in production.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Order</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">#${order.id}</td></tr>
        <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Status</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">Accepted — in production</td></tr>
        <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Total</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">$${order.total} ${order.currency}</td></tr>
        <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Payment</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">${order.payment_method === 'cod' ? 'Cash on Delivery' : 'PayPal'}</td></tr>
      </table>
      <p>We'll be in touch with shipping details as soon as it's ready.</p>
      <p>— CK Design Embroidery</p>
    `,
  };
}

export function orderDeclinedCustomerEmail(order) {
  return {
    subject: `ℹ️ Your CK Design Embroidery order #${order.id} was declined`,
    html: `
      <h2 style="color:#1c1811">We're not able to fulfil this order</h2>
      <p>Unfortunately we can't move forward with order #${order.id} right now.</p>
      <p>If you paid by PayPal, this amount will be refunded. If you'd like more detail, just reply to this email.</p>
      <p>— CK Design Embroidery</p>
    `,
  };
}

// One-time verification code (OTP) sent to the customer's email before
// they can place an order. Lets them confirm the account is theirs.
export function otpEmail({ code, siteName }) {
  return {
    subject: `Your ${siteName || 'CK Design Embroidery'} verification code`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1c1811;margin:0 0 16px">Verify your email</h2>
        <p style="color:#555;line-height:1.6">Use the code below to confirm your email address with us. It's valid for <strong>10 minutes</strong>.</p>
        <div style="background:#EFE7D8;border-radius:6px;padding:20px;text-align:center;margin:20px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1c1811">${code}</span>
        </div>
        <p style="color:#888;font-size:13px;line-height:1.5">If you didn't request this code, you can safely ignore this email.</p>
        <p style="color:#888;font-size:12px;margin-top:24px">— ${siteName || 'CK Design Embroidery'}</p>
      </div>
    `,
  };
}

// Email template for new contact/feedback/rating/quote inquiries.
export function newInquiryAdminEmail(inquiry) {
  const typeLabels = {
    message: 'Contact Message',
    feedback: 'Feedback',
    rating: 'Rating',
    quote: 'Quote Request',
  };

  return {
    subject: `New ${typeLabels[inquiry.type] || 'Inquiry'} #${inquiry.id} — from ${inquiry.name}`,
    html: `
      <h2>New ${typeLabels[inquiry.type] || 'Inquiry'} #${inquiry.id}</h2>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Name</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">${inquiry.name}</td></tr>
        <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Email</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">${inquiry.email}</td></tr>
        ${inquiry.phone ? `<tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Phone</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">${inquiry.phone}</td></tr>` : ''}
        ${inquiry.rating ? `<tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Rating</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">${'⭐'.repeat(inquiry.rating)}</td></tr>` : ''}
        ${inquiry.subject ? `<tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Subject</strong></td>
            <td style="padding:6px 12px;border:1px solid #ddd">${inquiry.subject}</td></tr>` : ''}
      </table>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left:3px solid #D4A537;padding-left:16px;margin:16px 0;color:#555">
        ${inquiry.message.replace(/\n/g, '<br/>')}
      </blockquote>
      <p>View in the <a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin/inquiries">admin dashboard</a>.</p>
    `,
  };
}
