import { z } from 'zod';

export const ACCEPTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
] as const;

export const MAX_FILES_PER_SUBMISSION = 5;
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const submissionSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  emailAddress: z.string().email('Valid email required').max(255),
  phoneWhatsapp: z.string().max(50).optional().or(z.literal('')),

  ageRange: z.string().max(50).optional().or(z.literal('')),
  gender: z.string().max(50).optional().or(z.literal('')),
  birthplace: z.string().max(255).optional().or(z.literal('')),
  totalYearsLivedInCountry: z.coerce.number().int().min(0).max(120).optional(),
  currentOccupation: z.string().max(255).optional().or(z.literal('')),
  nativeSpeakerOfDialect: z.string().max(20).optional().or(z.literal('')),

  contentType: z.string().max(100).optional().or(z.literal('')),
  audioDurationSeconds: z.coerce.number().int().min(0).max(36000).optional(),
  topicsCovered: z.string().max(2000).optional().or(z.literal('')),
  audioFileUrls: z.array(z.string().min(1)).min(1, 'At least one audio file required').max(MAX_FILES_PER_SUBMISSION),
  willingToProvideAdditionalContent: z.string().max(20).optional().or(z.literal('')),

  consentGiven: z.literal(true, { errorMap: () => ({ message: 'Consent is required to submit' }) }),
  anyOtherRelevantInformation: z.string().max(2000).optional().or(z.literal('')),
  additionalNotes: z.string().max(2000).optional().or(z.literal('')),
});

export type SubmissionPayload = z.infer<typeof submissionSchema>;
