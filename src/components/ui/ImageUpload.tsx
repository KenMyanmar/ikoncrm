import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  bucket: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  maxSizeMB?: number;
  aspectHint?: string;
  className?: string;
  /** When provided, file is uploaded as `<fileName>.<ext>` (flat path, no folder). */
  fileName?: string;
  /** Overwrite existing object at the same key. */
  upsert?: boolean;
}

export function ImageUpload({
  bucket,
  value,
  onChange,
  folder,
  maxSizeMB = 5,
  aspectHint,
  className = "",
  fileName,
  upsert = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be under ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    let path: string;
    if (fileName) {
      path = `${fileName}.${ext}`;
    } else {
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      path = folder
        ? `${folder}/${timestamp}_${random}.${ext}`
        : `${timestamp}_${random}.${ext}`;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    let { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (upsert) publicUrl = `${publicUrl}?t=${Date.now()}`;

    onChange(publicUrl);
    setUploading(false);
    toast.success("Image uploaded!");
  }, [bucket, folder, maxSizeMB, onChange, fileName, upsert]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className={cn("w-full", className)}>
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-border">
          <img src={value} alt="Uploaded" className="w-full h-40 object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground mt-2">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mt-2">
                Click or drag image here
              </span>
              <span className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, GIF — Max {maxSizeMB}MB
              </span>
              {aspectHint && (
                <span className="text-xs text-muted-foreground/70 mt-1">
                  Recommended: {aspectHint}
                </span>
              )}
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
            className="hidden"
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
}
