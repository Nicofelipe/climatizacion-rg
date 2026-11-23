import { Banner } from '@/components/ui/kit';

export default function ErrorBanner({ message }: { message: string }) {
  return <Banner tone="danger">{message}</Banner>;
}
