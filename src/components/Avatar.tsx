"use client";

import { Camera } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;       // tailwind w/h number (8, 10, 12, 16, 20, etc.)
  className?: string;
  editable?: boolean;
  uploading?: boolean;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Avatar({
  src,
  name,
  size = 10,
  className = "",
  editable = false,
  uploading = false,
  onUpload,
}: AvatarProps) {
  const sizeMap: Record<number, string> = {
    8: "w-8 h-8 text-xs",
    9: "w-9 h-9 text-sm",
    10: "w-10 h-10 text-sm",
    12: "w-12 h-12 text-base",
    16: "w-16 h-16 text-xl",
    20: "w-20 h-20 text-2xl",
    24: "w-24 h-24 text-3xl",
  };
  const sizeClass = sizeMap[size] || sizeMap[10];
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  const cameraSize: Record<number, string> = {
    8: "w-3 h-3",
    9: "w-3 h-3",
    10: "w-3.5 h-3.5",
    12: "w-4 h-4",
    16: "w-5 h-5",
    20: "w-6 h-6",
    24: "w-7 h-7",
  };

  return (
    <div className={`relative group shrink-0 ${className}`}>
      <div
        className={`${sizeClass} rounded-full bg-blue-600 flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-slate-700`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>

      {editable && onUpload && (
        <label
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity active:opacity-100"
          title="Upload photo"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
          ) : (
            <Camera className={`${cameraSize[size] || "w-5 h-5"} text-white`} />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      )}

      {/* Mobile-friendly upload button (visible always on small avatar, bottom-right badge) */}
      {editable && onUpload && size >= 16 && (
        <label
          className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-500 border-2 border-slate-800 rounded-full flex items-center justify-center cursor-pointer transition-colors md:hidden"
          title="Upload photo"
        >
          {uploading ? (
            <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
          ) : (
            <Camera className="w-3.5 h-3.5 text-white" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
