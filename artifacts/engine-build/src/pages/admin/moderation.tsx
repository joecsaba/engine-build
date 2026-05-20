import { useState } from "react";
import { Link } from "wouter";
import {
  useAdminPendingShops, useApproveShop, useRejectShop,
  useAdminEditSuggestions, useApplyEditSuggestion, useRejectEditSuggestion,
  useAdminAllShops, useAdminUpdateShop, useAdminDeleteShop,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Check, X, Edit, Trash2, Search, AlertCircle, ShieldCheck, MessageSquareWarning,
} from "lucide-react";

const ADMIN_EMAILS = new Set(["joecsaba@gmail.com"]);

/* ────────────────────────── Pending Shops Tab ────────────────────────── */

function PendingShopsTab() {
  const { data: pending, isLoading } = useAdminPendingShops();
  const approve = useApproveShop();
  const reject = useRejectShop();
  const { toast } = useToast();

  const handleApprove = async (id: number) => {
    try {
      await approve.mutateAsync({ id });
      toast({ title: "Shop approved" });
    } catch {
      toast({ title: "Approve failed", variant: "destructive" });
    }
  };
  const handleReject = async (id: number) => {
    if (!confirm("Reject and delete this submission?")) return;
    try {
      await reject.mutateAsync(id);
      toast({ title: "Shop rejected" });
    } catch {
      toast({ title: "Reject failed", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>;

  if (!pending || pending.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-green-500" />
        <p>No pending submissions. All caught up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map(s => (
        <Card key={s.id}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-lg font-bold">{s.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {s.address && `${s.address}, `}{s.city}, {s.state} {s.zip ?? ""}
                </p>
                {s.submitterEmail && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted by: {s.submitterEmail} on {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(s.id)} className="bg-green-600 hover:bg-green-700 text-white">
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReject(s.id)}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
              {s.phone && <div><span className="text-muted-foreground">Phone:</span> {s.phone}</div>}
              {s.email && <div><span className="text-muted-foreground">Email:</span> {s.email}</div>}
              {s.website && <div className="sm:col-span-2"><span className="text-muted-foreground">Website:</span> <a href={s.website} target="_blank" rel="noreferrer" className="text-[#E85D04] hover:underline">{s.website}</a></div>}
              {s.specialties.length > 0 && <div className="sm:col-span-2"><span className="text-muted-foreground">Specialties:</span> {s.specialties.join(", ")}</div>}
              {s.services.length > 0 && <div className="sm:col-span-2"><span className="text-muted-foreground">Services:</span> {s.services.join(", ")}</div>}
              {s.description && <div className="sm:col-span-2 text-muted-foreground italic">"{s.description}"</div>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ────────────────────── Edit Suggestions Tab ────────────────────────── */

function EditSuggestionsTab() {
  const { data: suggestions, isLoading } = useAdminEditSuggestions();
  const apply = useApplyEditSuggestion();
  const reject = useRejectEditSuggestion();
  const { toast } = useToast();
  const [editValues, setEditValues] = useState<Record<number, string>>({});

  const handleApply = async (id: number) => {
    const value = editValues[id];
    try {
      await apply.mutateAsync({ id, value });
      toast({ title: "Edit applied" });
      setEditValues(p => { const n = { ...p }; delete n[id]; return n; });
    } catch {
      toast({ title: "Apply failed", variant: "destructive" });
    }
  };
  const handleReject = async (id: number) => {
    try {
      await reject.mutateAsync(id);
      toast({ title: "Suggestion rejected" });
    } catch {
      toast({ title: "Reject failed", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>;

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-green-500" />
        <p>No pending edit suggestions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map(s => {
        const valueToApply = editValues[s.id] ?? s.newValue;
        return (
          <Card key={s.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <Link href={`/shop-tools/directory`}>
                    <h3 className="text-base font-bold hover:text-[#E85D04] cursor-pointer">{s.shopName}</h3>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Suggested by: {s.submitterEmail ?? "(anonymous)"} on {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                  {s.field}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Current value</Label>
                  <div className="p-2 bg-muted/50 rounded mt-1 text-sm whitespace-pre-wrap break-words">
                    {s.currentValue
                      ? Array.isArray(s.currentValue)
                        ? s.currentValue.join(", ")
                        : String(s.currentValue)
                      : <span className="text-muted-foreground italic">(empty)</span>}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Proposed value</Label>
                  <textarea
                    value={valueToApply}
                    onChange={e => setEditValues(p => ({ ...p, [s.id]: e.target.value }))}
                    className="w-full p-2 border rounded mt-1 text-sm bg-background h-20 resize-y"
                  />
                </div>
              </div>

              {s.submitterNote && (
                <div className="text-xs text-muted-foreground italic mb-3">
                  Note: "{s.submitterNote}"
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => handleReject(s.id)}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button size="sm" onClick={() => handleApply(s.id)} className="bg-green-600 hover:bg-green-700 text-white">
                  <Check className="w-4 h-4 mr-1" /> Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ────────────────────────── All Shops Tab ─────────────────────────── */

function EditShopDialog({ shop, onClose }: { shop: any; onClose: () => void }) {
  const [fields, setFields] = useState({
    name: shop.name ?? "",
    address: shop.address ?? "",
    city: shop.city ?? "",
    state: shop.state ?? "",
    zip: shop.zip ?? "",
    phone: shop.phone ?? "",
    email: shop.email ?? "",
    website: shop.website ?? "",
    description: shop.description ?? "",
    specialties: (shop.specialties ?? []).join(", "),
    services: (shop.services ?? []).join(", "),
    turnaroundTime: shop.turnaroundTime ?? "",
  });
  const update = useAdminUpdateShop();
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        id: shop.id,
        updates: {
          name: fields.name,
          address: fields.address || null,
          city: fields.city,
          state: fields.state,
          zip: fields.zip || null,
          phone: fields.phone || null,
          email: fields.email || null,
          website: fields.website || null,
          description: fields.description || null,
          specialties: fields.specialties.split(",").map(s => s.trim()).filter(Boolean),
          services: fields.services.split(",").map(s => s.trim()).filter(Boolean),
          turnaroundTime: fields.turnaroundTime,
        } as any,
      });
      toast({ title: "Shop updated" });
      onClose();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  return (
    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Edit {shop.name}</DialogTitle></DialogHeader>
      <form onSubmit={handleSave} className="space-y-3 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Label>Name</Label><Input value={fields.name} onChange={e => setFields(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={fields.address} onChange={e => setFields(p => ({ ...p, address: e.target.value }))} /></div>
          <div><Label>City</Label><Input value={fields.city} onChange={e => setFields(p => ({ ...p, city: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>State</Label><Input value={fields.state} onChange={e => setFields(p => ({ ...p, state: e.target.value }))} /></div>
            <div><Label>ZIP</Label><Input value={fields.zip} onChange={e => setFields(p => ({ ...p, zip: e.target.value }))} /></div>
          </div>
          <div><Label>Phone</Label><Input value={fields.phone} onChange={e => setFields(p => ({ ...p, phone: e.target.value }))} /></div>
          <div><Label>Email</Label><Input value={fields.email} onChange={e => setFields(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Website</Label><Input value={fields.website} onChange={e => setFields(p => ({ ...p, website: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Specialties (comma-separated)</Label><Input value={fields.specialties} onChange={e => setFields(p => ({ ...p, specialties: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Services (comma-separated)</Label><Input value={fields.services} onChange={e => setFields(p => ({ ...p, services: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Turnaround</Label><Input value={fields.turnaroundTime} onChange={e => setFields(p => ({ ...p, turnaroundTime: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><textarea value={fields.description} onChange={e => setFields(p => ({ ...p, description: e.target.value }))} className="w-full p-2 border rounded mt-1 text-sm bg-background h-20 resize-y" /></div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={update.isPending} className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white">
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function AllShopsTab() {
  const [search, setSearch] = useState("");
  const [editingShop, setEditingShop] = useState<any | null>(null);
  const { data: shops, isLoading } = useAdminAllShops(search || undefined);
  const del = useAdminDeleteShop();
  const { toast } = useToast();

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await del.mutateAsync(id);
      toast({ title: "Shop deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search by name, city, or state..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !shops || shops.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No shops match.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">{shops.length} shop{shops.length !== 1 ? "s" : ""}</p>
          {shops.slice(0, 50).map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{s.name}</span>
                  {s.approved === 0 && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">Pending</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {s.city}, {s.state} | {s.phone ?? "no phone"} | {(s.services?.length ?? 0)} services
                </p>
              </div>
              <div className="flex gap-1 shrink-0 ml-3">
                <Dialog open={editingShop?.id === s.id} onOpenChange={(o) => !o && setEditingShop(null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" onClick={() => setEditingShop(s)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  {editingShop?.id === s.id && <EditShopDialog shop={s} onClose={() => setEditingShop(null)} />}
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id, s.name)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {shops.length > 50 && (
            <p className="text-center text-sm text-muted-foreground py-3">
              Showing first 50 results. Refine search to see specific shops.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Main Page ─────────────────────────── */

export default function ModerationPage() {
  const { user, isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;

  if (!isSignedIn || !user || !ADMIN_EMAILS.has(user.email.toLowerCase())) {
    return (
      <div>
        <PageHeader eyebrow="Admin" title="Moderation" />
        <div className="container mx-auto max-w-md px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            {!isSignedIn ? "Please sign in to access the admin moderation page." : "Your account does not have admin access."}
          </p>
          {!isSignedIn && (
            <Link href="/sign-in"><Button className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white">Sign In</Button></Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SEOHead title="Admin Moderation" description="Admin moderation page for shop submissions and edits." />
      <PageHeader
        eyebrow="Admin"
        title="Moderation Dashboard"
        subtitle={`Signed in as ${user.email}. Review submissions, edit suggestions, and manage existing shops.`}
      />

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Tabs defaultValue="pending">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <MessageSquareWarning className="w-4 h-4" /> Pending Shops
            </TabsTrigger>
            <TabsTrigger value="edits" className="gap-2">
              <Edit className="w-4 h-4" /> Edit Suggestions
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <ShieldCheck className="w-4 h-4" /> All Shops
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending"><PendingShopsTab /></TabsContent>
          <TabsContent value="edits"><EditSuggestionsTab /></TabsContent>
          <TabsContent value="all"><AllShopsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
