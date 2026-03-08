import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FileUploadProps {
  bucket: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
  className?: string;
}

export function FileUpload({
  bucket,
  value,
  onChange,
  folder,
  maxSizeMB = 10,
  accept = ".pdf",
  label,
  className = "",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = folder
      ? `${folder}/${timestamp}_${random}_${safeName}`
      : `${timestamp}_${random}_${safeName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    onChange(publicUrl);
    setUploading(false);
    toast.success("File uploaded!");
  }, [bucket, folder, maxSizeMB, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const getFileName = (url: string) => {
    try {
      const parts = url.split("/");
      const raw = decodeURIComponent(parts[parts.length - 1]);
      // Remove timestamp_random_ prefix
      return raw.replace(/^\d+_[a-z0-9]+_/, "");
    } catch {
      return "Uploaded file";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {value ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm truncate flex-1">{getFileName(value)}</span>
          <a href={value} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onChange("")}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground mt-2">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mt-2">Click or drag file here</span>
              {label && <span className="text-xs text-muted-foreground/70">{label}</span>}
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
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
