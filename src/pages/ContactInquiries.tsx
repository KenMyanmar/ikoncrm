import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, RefreshCw, Mail, Phone, Copy } from "lucide-react";
import { toast } from "sonner";

type Inquiry = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  business_type: string[];
  inquiry_type: string[];
};

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function ContactInquiries() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["contact-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Inquiry[];
    },
  });

  if (isError) {
    toast.error("Failed to load inquiries");
  }

  const filtered = useMemo(() => {
    const list = data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(i =>
      [i.name, i.email, i.company || "", i.message || ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, search]);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contact Inquiries</h1>
          <p className="text-sm text-muted-foreground">Submissions from the ikonmart.com Contact Us form</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{data?.length ?? 0} total</Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, company, message…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Inquiry Type</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead className="min-w-[220px]">Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      {search ? "No inquiries match your search." : "No inquiries yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(i => (
                    <TableRow
                      key={i.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(i)}
                    >
                      <TableCell
                        className="text-xs text-muted-foreground whitespace-nowrap"
                        title={new Date(i.created_at).toLocaleString()}
                      >
                        {relativeTime(i.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{i.name}</TableCell>
                      <TableCell className="text-sm">
                        <a
                          href={`mailto:${i.email}`}
                          onClick={e => e.stopPropagation()}
                          className="text-primary hover:underline"
                        >
                          {i.email}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">
                        {i.phone ? (
                          <a
                            href={`tel:${i.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="text-primary hover:underline whitespace-nowrap"
                          >
                            {i.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{i.company || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(i.inquiry_type || []).map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(i.business_type || []).map(t => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[320px]">
                        <p className="line-clamp-2">{i.message || "—"}</p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</p>
                  <p className="font-medium">{selected.name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(selected.created_at).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyEmail(selected.email)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {selected.phone && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`tel:${selected.phone}`} className="text-primary hover:underline">{selected.phone}</a>
                    </div>
                  </div>
                )}
                {selected.company && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Company</p>
                    <p className="font-medium">{selected.company}</p>
                  </div>
                )}
              </div>

              {selected.inquiry_type?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Inquiry Type</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.inquiry_type.map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selected.business_type?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Business Type</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.business_type.map(t => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Message</p>
                <p className="whitespace-pre-wrap text-sm bg-muted/40 rounded-md p-3 border">
                  {selected.message || <span className="text-muted-foreground">No message provided.</span>}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}