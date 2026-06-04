import { Metadata } from 'next';
import { SubmitForm } from './SubmitForm';
import { BrandedLayout } from './layout-with-branding';

export const metadata: Metadata = {
  title: 'Submit Audio — Voice Recording & Transcription',
  description: 'Submit your audio recordings for the Voice Recording & Transcription project.',
};

export default function SubmitPage() {
  return (
    <BrandedLayout>
      <SubmitForm />
    </BrandedLayout>
  );
}
