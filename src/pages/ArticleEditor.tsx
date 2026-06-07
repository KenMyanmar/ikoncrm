import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const TAG_OPTIONS = ["kitchen", "insights", "brands", "care", "guides"];

const generateSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface ArticleForm {
  title: string;
  slug: string;
  excerpt: string;
  featured_image_url: string;
  body: string;
  tags: string[];
  category_id: string;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
}

const emptyForm: ArticleForm = {
  title: "",
  slug: "",
  excerpt: "",
  featured_image_url: "",
  body: "",
  tags: [],
  category_id: "",
  is_featured: false,
  meta_title: "",
  meta_description: "",
};

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const isNew = !id || id === "new";

  const [form, setForm] = useState<ArticleForm>(emptyForm);
  const [slugManual, setSlugManual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnpublish, setShowUnpublish] = useState(false);

  // Fetch existing article
  const { data: article, isLoading } = useQuery({
    queryKey: ["crm-article", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!id,
  });

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-depth0"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("depth", 0)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  // Populate form on edit
  useEffect(() => {
    if (article) {
      setForm({
        title: article.title || "",
        slug: article.slug || "",
        excerpt: article.excerpt || "",
        featured_image_url: article.featured_image_url || "",
        body: article.body || "",
        tags: (article.tags as string[]) || [],
        category_id: article.category_id || "",
        is_featured: article.is_featured ?? false,
        meta_title: article.meta_title || "",
        meta_description: article.meta_description || "",
      });
      setSlugManual(true);
    }
  }, [article]);

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      ...(!slugManual ? { slug: generateSlug(title) } : {}),
    }));
  };

  const handleTagToggle = (tag: string) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!form.title.trim()) throw new Error("Title is required");
      if (!form.body.trim()) throw new Error("Body content is required");

      const slug = form.slug || generateSlug(form.title);
      const payload = {
        title: form.title.trim(),
        slug,
        excerpt: form.excerpt || null,
        featured_image_url: form.featured_image_url || null,
        body: form.body,
        tags: form.tags,
        category_id: form.category_id || null,
        is_featured: form.is_featured,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        status: status as "draft" | "published" | "archived",
        ...(status === "published" && !article?.published_at
          ? { published_at: new Date().toISOString() }
          : {}),
        updated_at: new Date().toISOString(),
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("articles")
          .insert([{
            ...payload,
            author_id: staff?.id || null,
            author_name: staff?.full_name || null,
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("articles")
          .update(payload)
          .eq("id", id!)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data, status) => {
      queryClient.invalidateQueries({ queryKey: ["crm-articles"] });
      queryClient.invalidateQueries({ queryKey: ["crm-articles-counts"] });
      toast.success(status === "published" ? "Article published!" : "Draft saved");
      if (isNew && data?.id) {
        navigate(`/articles/${data.id}`, { replace: true });
      }
    },
    onError: (err: Error) => {
      if (err.message.includes("unique") || err.message.includes("duplicate")) {
        toast.error("Slug already exists — please use a different slug");
      } else {
        toast.error(err.message);
      }
    },
  });

  const handleSave = async (status: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await saveMutation.mutateAsync(status);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    setShowUnpublish(false);
    await handleSave("draft");
  };

  if (!isNew && isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  const isPublished = article?.status === "published";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/articles")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Articles
        </button>
        <div className="flex gap-2">
          {isPublished && (
            <Button variant="outline" size="sm" onClick={() => setShowUnpublish(true)} disabled={isSubmitting}>
              Unpublish
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={isSubmitting}>
            Save Draft
          </Button>
          <Button size="sm" onClick={() => handleSave("published")} disabled={isSubmitting} className="bg-primary text-primary-foreground">
            Publish
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Article title"
          className="text-lg font-semibold"
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label>Slug</Label>
        <div className="flex items-center gap-2">
          <Input
            value={form.slug}
            onChange={(e) => {
              setSlugManual(true);
              setForm((f) => ({ ...f, slug: e.target.value }));
            }}
            placeholder="auto-generated-slug"
          />
        </div>
        <p className="text-xs text-muted-foreground">{BRAND.storefrontHost}/articles/{form.slug || "..."}</p>
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <Label>Excerpt</Label>
        <Textarea
          value={form.excerpt}
          onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value.slice(0, 200) }))}
          placeholder="Short summary for article cards and SEO (max 200 chars)"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">{form.excerpt.length}/200</p>
      </div>

      {/* Featured Image */}
      <div className="space-y-2">
        <Label>Featured Image</Label>
        <ImageUpload
          bucket="banners"
          folder="articles"
          value={form.featured_image_url}
          onChange={(url) => setForm((f) => ({ ...f, featured_image_url: url }))}
          aspectHint="1200×630px recommended"
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          placeholder="Write your article content here (HTML or Markdown supported)..."
          className="min-h-[400px] font-mono text-sm"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-3">
          {TAG_OPTIONS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={form.tags.includes(tag)}
                onCheckedChange={() => handleTagToggle(tag)}
              />
              <span className="capitalize">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category (optional)</Label>
        <Select
          value={form.category_id || "none"}
          onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? "" : v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Featured */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={form.is_featured}
          onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: !!v }))}
        />
        <span className="text-sm">Featured Article (shows in hero section on E-Mall)</span>
      </label>

      {/* SEO */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">SEO Overrides</h3>
        <div className="space-y-2">
          <Label>Meta Title</Label>
          <Input
            value={form.meta_title}
            onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
            placeholder="Custom page title for search engines"
          />
        </div>
        <div className="space-y-2">
          <Label>Meta Description</Label>
          <Textarea
            value={form.meta_description}
            onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
            placeholder="Custom meta description for search engines"
            rows={2}
          />
        </div>
      </div>

      {/* Unpublish Confirmation */}
      <AlertDialog open={showUnpublish} onOpenChange={setShowUnpublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Article</AlertDialogTitle>
            <AlertDialogDescription>
              This article will be reverted to draft status and hidden from the E-Mall.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpublish}>Unpublish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
