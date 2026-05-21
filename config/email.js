const nodemailer = require('nodemailer');

// Create transporter — configure with your SMTP provider
const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const FROM = '"Nikunj Platform" <noreply@nikunj.in>';

// ─── Email Templates ─────────────────────────────────────────
const templates = {
  listingApproved: (ownerName, listingTitle) => ({
    subject: `✅ Your listing "${listingTitle}" is now live on Nikunj!`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="background:#0F172A;padding:24px 32px">
          <h1 style="color:#fff;font-size:1.4rem;margin:0;letter-spacing:1px">Nikunj<span style="color:#CBA35C">.</span></h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#0F172A;margin-top:0">Great news, ${ownerName}! 🎉</h2>
          <p style="color:#555;line-height:1.7">Your listing <strong>"${listingTitle}"</strong> has been reviewed and approved by our team. It is now live on Nikunj and visible to thousands of users.</p>
          <a href="https://nikunj.in" style="display:inline-block;background:#CBA35C;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:8px">View Your Listing →</a>
          <p style="margin-top:24px;font-size:0.85rem;color:#999">Users can now contact you directly through your listing.</p>
        </div>
        <div style="background:#F8FAFC;padding:16px 32px;font-size:0.8rem;color:#64748B;text-align:center;border-top:1px solid #E2E8F0">
          © 2026 Nikunj · Jaipur's premium housing & living marketplace
        </div>
      </div>`
  }),

  listingRejected: (ownerName, listingTitle, reason) => ({
    subject: `Your listing "${listingTitle}" needs some changes`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="background:#0F172A;padding:24px 32px">
          <h1 style="color:#fff;font-size:1.4rem;margin:0;letter-spacing:1px">Nikunj<span style="color:#CBA35C">.</span></h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#0F172A;margin-top:0">Hi ${ownerName},</h2>
          <p style="color:#555;line-height:1.7">Unfortunately, your listing <strong>"${listingTitle}"</strong> could not be approved at this time.</p>
          ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin:16px 0;color:#991b1b"><strong>Reason:</strong> ${reason}</div>` : ''}
          <p style="color:#555;line-height:1.7">Please make the necessary changes and resubmit your listing. Our team will review it again within 24 hours.</p>
          <a href="https://nikunj.in" style="display:inline-block;background:#0F172A;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:8px">Edit & Resubmit →</a>
        </div>
        <div style="background:#F8FAFC;padding:16px 32px;font-size:0.8rem;color:#64748B;text-align:center;border-top:1px solid #E2E8F0">
          © 2026 Nikunj · Questions? hello@nikunj.in
        </div>
      </div>`
  }),

  welcome: (userName, role) => ({
    subject: 'Welcome to Nikunj! 🏠',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="background:#0F172A;padding:32px">
          <h1 style="color:#fff;font-size:1.8rem;margin:0;font-family:serif;letter-spacing:1px">Nikunj<span style="color:#CBA35C">.</span></h1>
          <p style="color:rgba(255,255,255,.6);margin-top:8px;margin-bottom:0">Premium Housing & Rental Marketplace, Jaipur</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#0F172A;margin-top:0">Welcome, ${userName}! 👋</h2>
          <p style="color:#555;line-height:1.7">You've successfully joined Nikunj as a <strong>${role}</strong>. ${
            role === 'student'
              ? 'You can now browse verified hostels, PG rooms, flats, roommate matches, and tiffin services in Jaipur.'
              : 'You can now list your property and reach thousands of seekers in Jaipur.'
          }</p>
          <a href="https://nikunj.in" style="display:inline-block;background:#CBA35C;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:8px">Get Started →</a>
        </div>
        <div style="background:#F8FAFC;padding:16px 32px;font-size:0.8rem;color:#64748B;text-align:center;border-top:1px solid #E2E8F0">
          © 2026 Nikunj · Made with ❤️ in Jaipur
        </div>
      </div>`
  }),

  newInquiry: (ownerName, studentName, studentPhone, listingTitle, message) => ({
    subject: `New inquiry for "${listingTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="background:#0F172A;padding:24px 32px">
          <h1 style="color:#fff;font-size:1.4rem;margin:0;letter-spacing:1px">Nikunj<span style="color:#CBA35C">.</span></h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#0F172A;margin-top:0">New inquiry, ${ownerName}!</h2>
          <p style="color:#555;line-height:1.7">Someone is interested in your listing <strong>"${listingTitle}"</strong> on Nikunj.</p>
          <div style="background:#F8FAFC;border-radius:10px;padding:16px;margin:16px 0;border:1px solid #E2E8F0">
            <p style="margin:0 0 8px;color:#0F172A"><strong>Name:</strong> ${studentName}</p>
            <p style="margin:0 0 8px;color:#0F172A"><strong>Phone:</strong> ${studentPhone}</p>
            ${message ? `<p style="margin:0;color:#555"><strong>Message:</strong> ${message}</p>` : ''}
          </div>
          <p style="color:#555">Contact them directly to discuss availability and terms.</p>
        </div>
        <div style="background:#F8FAFC;padding:16px 32px;font-size:0.8rem;color:#64748B;text-align:center;border-top:1px solid #E2E8F0">
          © 2026 Nikunj · Questions? hello@nikunj.in
        </div>
      </div>`
  })
};

// ─── Send Functions ──────────────────────────────────────────
const sendMail = async (to, template) => {
  try {
    if (!process.env.SMTP_USER) {
      console.log(`[Email skipped - SMTP not configured] To: ${to} | Subject: ${template.subject}`);
      return { skipped: true };
    }
    const transporter = createTransporter();
    const info = await transporter.sendMail({ from: FROM, to, ...template });
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('Email error:', err.message);
    return null;
  }
};

module.exports = {
  sendWelcome: (to, name, role) => sendMail(to, templates.welcome(name, role)),
  sendApproved: (to, ownerName, title) => sendMail(to, templates.listingApproved(ownerName, title)),
  sendRejected: (to, ownerName, title, reason) => sendMail(to, templates.listingRejected(ownerName, title, reason)),
  sendInquiry: (to, ownerName, studentName, studentPhone, title, msg) =>
    sendMail(to, templates.newInquiry(ownerName, studentName, studentPhone, title, msg))
};
