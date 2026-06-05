import nodemailer from 'nodemailer';

export async function sendConfirmationEmail(opts: {
  toEmail: string;
  toName: string;
  submissionId: string;
  numFiles: number;
}) {
  const { toEmail, toName, submissionId, numFiles } = opts;

  const gmailUser = process.env.GMAIL_SMTP_USER || '';
  const gmailPass = process.env.GMAIL_SMTP_APP_PASSWORD || '';
  const notifyEmail = process.env.SUBMISSION_NOTIFY_EMAIL || 'alerts@aisolutionsnet.net';

  if (!gmailUser || !gmailPass) {
    throw new Error(
      `Email env vars missing — GMAIL_SMTP_USER: "${gmailUser ? 'set' : 'MISSING'}", GMAIL_SMTP_APP_PASSWORD: "${gmailPass ? 'set' : 'MISSING'}"`
    );
  }

  // Create transporter inside the function so env vars are always fresh
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const subject = 'Voice Recording & Transcription — Submission Received';
  const text = `Hi ${toName},

Thank you for your submission to the Voice Recording & Transcription project.

We have received your submission with ${numFiles} audio file${numFiles === 1 ? '' : 's'}.

Reference ID: ${submissionId}

Please keep this email for your records. If you'd like to submit additional recordings, you can return to the submission page anytime — there is no limit on the number of submissions.

If you have questions, just reply to this email.

— AI Solutions team
`;

  const info = await transporter.sendMail({
    from: `"AI Solutions" <${gmailUser}>`,
    to: toEmail,
    cc: notifyEmail,
    subject,
    text,
  });

  console.log('Email sent — messageId:', info.messageId, '| to:', toEmail);
  return info;
}
