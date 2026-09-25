// Groups the flat `messages` table into one row per customer for the
// admin/staff inbox list — used both by the initial server render and
// by the client-side poller in AdminMessagesPanel, so the two never
// drift apart.
export function groupConversations(messages) {
  const byUser = new Map();
  for (const m of messages) {
    const existing = byUser.get(m.user_id);
    if (!existing) {
      byUser.set(m.user_id, {
        userId: m.user_id,
        customerEmail: m.customer_email,
        lastBody: m.body,
        lastAt: m.created_at,
        lastSenderRole: m.sender_role,
        unreadCount: m.sender_role === 'customer' && !m.read_by_staff ? 1 : 0,
      });
    } else {
      existing.lastBody = m.body;
      existing.lastAt = m.created_at;
      existing.lastSenderRole = m.sender_role;
      existing.customerEmail = m.customer_email || existing.customerEmail;
      if (m.sender_role === 'customer' && !m.read_by_staff) existing.unreadCount += 1;
    }
  }
  return Array.from(byUser.values()).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
}
