'use client';

import React from 'react';
import { DevlogForm, PageLayout } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';

export function DevlogCreatePage() {
  const { createDevlog } = useDevlogs();
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    try {
      await createDevlog(data);
      router.push('/devlogs');
    } catch (error) {
      console.error('Failed to create devlog:', error);
    }
  };

  const handleCancel = () => {
    router.push('/devlogs');
  };

  const actions = (
    <div>
      <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
        <ArrowLeftIcon size={16} />
        Back to List
      </Button>
    </div>
  );

  return (
    <PageLayout actions={actions}>
      <DevlogForm 
        onSubmit={handleSubmit} 
        onCancel={handleCancel} 
      />
    </PageLayout>
  );
}
