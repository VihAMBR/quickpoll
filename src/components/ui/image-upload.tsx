'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, X } from 'lucide-react';
import { UploadButton } from '@uploadthing/react';
import { OurFileRouter } from '@/app/api/uploadthing/core';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  currentImage?: string;
}

export function ImageUpload({ onImageUploaded, onImageRemoved, currentImage }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string>(currentImage || '');

  return (
    <div className="flex flex-col items-center gap-4">
      {imageUrl ? (
        <div className="relative">
          <img 
            src={imageUrl} 
            alt="Option image" 
            className="w-32 h-32 object-cover rounded-lg"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={() => {
              setImageUrl('');
              onImageRemoved();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <UploadButton<OurFileRouter, any>
          endpoint="pollImage"
          onClientUploadComplete={(res) => {
            if (res?.[0]) {
              const url = res[0].url;
              setImageUrl(url);
              onImageUploaded(url);
            }
          }}
          onUploadError={(error: Error) => {
            console.error('Upload error:', error);
          }}
        />
      )}
    </div>
  );
}
