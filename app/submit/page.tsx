import { Metadata } from 'next';
import { SubmitForm } from './SubmitForm';

export const metadata: Metadata = {
  title: 'Submit Audio — Voice Recording & Transcription',
  description: 'Submit your audio recordings for the Voice Recording & Transcription project.',
};

export default function SubmitPage() {
  return <SubmitForm />;
}
