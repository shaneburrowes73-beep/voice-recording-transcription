import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_SMTP_USER;
    const pass = process.env.GMAIL_SMTP_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error('Missing GMAIL_SMTP_USER or GMAIL_SMTP_APP_PASSWORD');
    }

    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }

  return transporter;
}

export async function sendConfirmationEmail(opts: {
  toEmail: string;
  toName: string;
  submissionId: string;
  numFiles: number;
}) {
  const { toEmail, toName, submissionId, numFiles } = opts;
  const notifyEmail = process.env.SUBMISSION_NOTIFY_EMAIL || 'aisolutions@aisolutionsnet.net';
  const gmailUser = process.env.GMAIL_SMTP_USER;

  if (!gmailUser) {
    throw new Error('Missing GMAIL_SMTP_USER');
  }

  const subject = 'Voice Recording & Transcription — Submission Received';
  const text = `Hi ${toName},

Thank you for your submission to the Voice Recording & Transcription project.

We have received your submission with ${numFiles} audio file${numFiles === 1 ? '' : 's'}.

Reference ID: ${submissionId}

Please keep this email for your records. If you'd like to submit additional recordings, you can return to the submission page anytime — there's no limit on the number of submissions.

If you have questions, just reply to this email.

— AI Solutions team
`;

  const smtp = getTransporter();
  await smtp.sendMail({
    from: `"AI Solutions" <${gmailUser}>`,
    to: toEmail,
    cc: notifyEmail,
    subject,
    text,
  });
}
