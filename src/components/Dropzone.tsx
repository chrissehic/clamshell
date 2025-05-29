'use client';

import { useState } from 'react';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/shadcn-io/dropzone';

const Example = () => {
  const [files, setFiles] = useState<File[] | undefined>();

  const handleDrop = (files: File[]) => {
    console.log(files);
    setFiles(files);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-secondary p-8">
      <Dropzone
        maxSize={1024 * 1024 * 10}
        minSize={1024}
        maxFiles={10}
        accept={{ 'image/*': [] }}
        onDrop={handleDrop}
        src={files}
        onError={console.error}
      >
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
    </div>
  );
}

export default Example;