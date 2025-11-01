import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';

type ProjectPageProps = {
  params: { projectId?: string };
};

export default function ProjectPage({ params }: ProjectPageProps) {
  const projectId = params.projectId;

  if (!projectId) {
    notFound();
  }

  return <AppShell />;
}
