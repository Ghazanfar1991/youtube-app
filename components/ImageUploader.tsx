import React, { useRef } from 'react';
// Fix: Renamed ImageIcon to Image to match export from icons.tsx
import { Image, XIcon } from './icons';

interface ImageUploaderProps {
  label: string;
  image: string | null;
  setImage: (file: File | null) => void;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, image, setImage, className = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      <div
        className="relative w-full aspect-video bg-white rounded-lg border-2 border-dashed border-neutral-300 hover:border-blue-500 transition-colors cursor-pointer flex items-center justify-center text-neutral-400"
        onClick={() => inputRef.current?.click()}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
        />
        {image ? (
          <>
            <img src={image} alt={label} className="object-cover w-full h-full rounded-md" />
            <button
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
              aria-label={`Remove ${label}`}
            >
              <XIcon className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-center">
            {/* Fix: Using renamed Image component */}
            <Image className="w-8 h-8 mx-auto" />
            <p className="text-xs mt-1">Click to upload</p>
          </div>
        )}
      </div>
    </div>
  );
};
