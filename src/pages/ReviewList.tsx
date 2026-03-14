import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle, XCircle, MessageSquare, Search, Star,
} from "lucide-react";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  reviewer_email: string | null;
  status: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  is_verified_purchase: boolean | null;
  created_at: string | null;
  product: { id: string; stock_code: string; description: string; thumbnail_url: string | null } | null;
  customer: { id: string; name: string | null; email: string | null; company_name: string | null } | null;
};

function relativeDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">Pending</Badge>;
    case "approved":
      return <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function ReviewList() {
  const { staff } = useStaff();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [replyReview, setReplyReview] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", statusFilter, sort],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select(`
          id, rating, comment, reviewer_name, reviewer_email, status,
          admin_response, responded_by, responded_at,
          is_verified_purchase, created_at,
          product:products(id, stock_code, description, thumbnail_url),
          customer:customers(id, name, email, company_name)
        `);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const ascending = sort === "oldest";
      if (sort === "highest") {
        query = query.order("rating", { ascending: false });
      } else if (sort === "lowest") {
        query = query.order("rating", { ascending: true });
      } else {
        query = query.order("created_at", { ascending });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ReviewRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return reviews;
    const q = search.toLowerCase();
    return reviews.filter(
      (r) =>
        r.reviewer_name?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q) ||
        r.product?.stock_code?.toLowerCase().includes(q) ||
        r.product?.description?.toLowerCase().includes(q)
    );
  }, [reviews, search]);

  const counts = useMemo(() => {
    const all = reviews;
    return {
      total: all.length,
      pending: all.filter((r) => r.status === "pending").length,
      approved: all.filter((r) => r.status === "approved").length,
      rejected: all.filter((r) => r.status === "rejected").length,
    };
  }, [reviews]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reviewerName }: { id: string; status: string; reviewerName: string }) => {
      const { error } = await supabase.from("reviews").update({ status } as any).eq("id", id);
      if (error) throw error;
      if (staff) {
        await logActivity(staff.id, `review_${status}`, "review", id, reviewerName);
      }
    },
    onSuccess: (_, vars) => {
      toast({ title: `Review ${vars.status}`, description: `Review has been ${vars.status}.` });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const submitReply = useMutation({
    mutationFn: async ({ id, response, reviewerName }: { id: string; response: string; reviewerName: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({
          admin_response: response,
          responded_by: staff?.id,
          responded_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
      if (staff) {
        await logActivity(staff.id, "review_replied", "review", id, reviewerName);
      }
    },
    onSuccess: () => {
      toast({ title: "Reply saved" });
      setReplyReview(null);
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const toggleVerified = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_verified_purchase: value } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Reviews</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" count={counts.total} className="bg-muted/50" />
        <StatCard label="Pending" count={counts.pending} className="bg-amber-50 border-amber-200 text-amber-700" />
        <StatCard label="Approved" count={counts.approved} className="bg-green-50 border-green-200 text-green-700" />
        <StatCard label="Rejected" count={counts.rejected} className="bg-red-50 border-red-200 text-red-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reviews…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-60"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="highest">Highest rating</SelectItem>
              <SelectItem value="lowest">Lowest rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="max-w-[200px]">Comment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No reviews found.</TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {r.product?.thumbnail_url && (
                        <img src={r.product.thumbnail_url} alt="" className="h-8 w-8 rounded object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-muted-foreground">{r.product?.stock_code}</p>
                        <p className="text-sm truncate max-w-[160px]">{r.product?.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{r.reviewer_name}</p>
                    {r.customer?.company_name && (
                      <p className="text-xs text-muted-foreground">{r.customer.company_name}</p>
                    )}
                  </TableCell>
                  <TableCell><Stars count={r.rating} /></TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm truncate" title={r.comment || ""}>
                      {r.comment ? (r.comment.length > 100 ? r.comment.slice(0, 100) + "…" : r.comment) : "—"}
                    </p>
                    {r.admin_response && (
                      <p className="text-xs text-primary mt-1 truncate" title={r.admin_response}>
                        ↳ {r.admin_response.slice(0, 60)}…
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={!!r.is_verified_purchase}
                      onCheckedChange={(v) => toggleVerified.mutate({ id: r.id, value: !!v })}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {relativeDate(r.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {r.status !== "approved" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => updateStatus.mutate({ id: r.id, status: "approved", reviewerName: r.reviewer_name })}
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {r.status !== "rejected" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => updateStatus.mutate({ id: r.id, status: "rejected", reviewerName: r.reviewer_name })}
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                        onClick={() => { setReplyReview(r); setReplyText(r.admin_response || ""); }}
                        title="Reply"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reply Dialog */}
      <Dialog open={!!replyReview} onOpenChange={(o) => { if (!o) setReplyReview(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
          </DialogHeader>
          {replyReview && (
            <div className="space-y-4">
              <div className="space-y-1 bg-muted/50 rounded-md p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{replyReview.reviewer_name}</p>
                  <Stars count={replyReview.rating} />
                </div>
                <p className="text-xs text-muted-foreground">{replyReview.product?.stock_code} — {replyReview.product?.description}</p>
                <p className="text-sm mt-2">{replyReview.comment || "No comment."}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Your Reply</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Write your response…"
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyReview(null)}>Cancel</Button>
            <Button
              disabled={!replyText.trim() || submitReply.isPending}
              onClick={() => {
                if (replyReview) {
                  submitReply.mutate({ id: replyReview.id, response: replyText, reviewerName: replyReview.reviewer_name });
                }
              }}
            >
              {submitReply.isPending ? "Saving…" : "Save Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, count, className }: { label: string; count: number; className?: string }) {
  return (
    <div className={`rounded-lg border p-4 text-center ${className || ""}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
