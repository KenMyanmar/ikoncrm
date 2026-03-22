import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

type ArticleStatus = "all" | "published" | "draft" | "archived";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-500",
  draft: "bg-yellow-500",
  archived: "bg-muted-foreground",
};

export default function ArticlesManagement() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ArticleStatus>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["crm-articles", statusFilter, search, sortBy],
    queryFn: async () => {
      let query = supabase.from("articles").select("*");

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (search.trim()) {
        query = query.ilike("title", `%${search.trim()}%`);
      }

      switch (sortBy) {
        case "most_viewed":
          query = query.order("view_count", { ascending: false });
          break;
        case "recently_updated":
          query = query.order("updated_at", { ascending: false });
          break;
        case "sort_order":
          query = query.order("sort_order", { ascending: true });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["crm-articles-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("status");
      if (error) throw error;
      const all = data?.length || 0;
      const published = data?.filter((a) => a.status === "published").length || 0;
      const draft = data?.filter((a) => a.status === "draft").length || 0;
      const archived = data?.filter((a) => a.status === "archived").length || 0;
      return { all, published, draft, archived };
    },
  });

  const tabs: { key: ArticleStatus; label: string }[] = [
    { key: "all", label: `All (${counts?.all ?? 0})` },
    { key: "published", label: `Published (${counts?.published ?? 0})` },
    { key: "draft", label: `Draft (${counts?.draft ?? 0})` },
    { key: "archived", label: `Archived (${counts?.archived ?? 0})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Articles Management</h1>
        <Button onClick={() => navigate("/articles/new")} className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> New Article
        </Button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === tab.key
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-60"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="most_viewed">Most viewed</SelectItem>
              <SelectItem value="recently_updated">Recently updated</SelectItem>
              <SelectItem value="sort_order">Manual order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Articles Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading articles...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No articles found. Create your first article to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Card
              key={article.id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/articles/${article.id}`)}
            >
              {/* Image */}
              <div className="h-40 overflow-hidden">
                {article.featured_image_url ? (
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-4xl text-muted-foreground/30">📝</span>
                  </div>
                )}
              </div>

              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
                  {article.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {article.published_at
                      ? format(new Date(article.published_at), "MMM d, yyyy")
                      : format(new Date(article.created_at!), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {article.view_count ?? 0} views
                  </span>
                </div>

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {article.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${STATUS_COLORS[article.status ?? "draft"]}`}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {article.status ?? "draft"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/articles/${article.id}`);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
