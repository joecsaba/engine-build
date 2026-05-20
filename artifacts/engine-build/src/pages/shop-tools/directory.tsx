import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetShops, useSubmitShop, useSubmitShopRating, useSubmitShopEdit, geocodeAddress } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import {
  Search, Star, Phone, Globe, Mail, MapPin, Wrench, Clock,
  PlusCircle, Pencil, Building2, Navigation, Loader2, X,
} from "lucide-react";

/* ───────────────────── Constants ───────────────────── */

const specialtyOptions = [
  "LS", "SBC", "BBC", "Ford", "Mopar", "Import", "Diesel",
  "Hemi", "Pontiac", "Buick", "Oldsmobile", "Marine",
  "Small Engine", "Motorcycle", "Industrial",
];

const serviceOptions = [
  "Bore & Hone", "Deck Surfacing", "Valve Job", "Head Porting", "CNC Porting",
  "Crank Grinding", "Balancing", "Align Boring", "Line Boring",
  "Full Engine Assembly", "Dyno Tuning", "Hot Tank", "Magnaflux",
  "Cam Bearing Install", "Press Work", "Seat & Guide Work",
  "Sleeve Install", "Block Repair / Welding", "Head Rebuilding",
  "Flow Bench Testing",
];

const states = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

/* ───────────────────── Stars ───────────────────── */

function Stars({ rating, count }: { rating: number | null; count: number }) {
  if (!rating) return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  return (
    <span className="flex items-center gap-1 text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
      ))}
      <span className="text-muted-foreground ml-1">{rating.toFixed(1)} ({count})</span>
    </span>
  );
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star className={`w-7 h-7 transition-colors ${filled ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────── Rate Dialog ───────────────────── */

function RateShopDialog({ shopId, shopName }: { shopId: number; shopName: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ratingMutation = useSubmitShopRating({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/directory/shops"] });
        toast({ title: "Rating submitted!", description: "Thank you for your feedback." });
        setOpen(false);
        setRating(0);
        setComment("");
      },
      onError: () => {
        toast({ title: "Failed to submit rating", description: "Please try again.", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    ratingMutation.mutate({ id: shopId, data: { rating, comment: comment || undefined } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
          <Star className="w-3 h-3" /> Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate {shopName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Your rating *</Label>
            <StarRatingInput value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-xs text-muted-foreground">
                {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Comment <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm resize-none bg-background h-20"
              placeholder="Share your experience with this shop..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={rating === 0 || ratingMutation.isPending}>
              {ratingMutation.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────── Suggest Edit Dialog ───────────────────── */

function SuggestEditDialog({ shopId, shopName }: { shopId: number; shopName: string }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState("");
  const [newValue, setNewValue] = useState("");
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const { isSignedIn } = useAuth();

  const editMutation = useSubmitShopEdit({
    mutation: {
      onSuccess: () => {
        toast({ title: "Edit suggestion submitted!", description: "We'll review it shortly." });
        setOpen(false);
        setField("");
        setNewValue("");
        setNote("");
      },
      onError: () => {
        toast({ title: "Failed to submit suggestion", description: "Please try again.", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!field || !newValue) return;
    editMutation.mutate({ id: shopId, data: { field, newValue, submitterNote: note || undefined } });
  };

  const editableFields = [
    { value: "phone", label: "Phone Number" },
    { value: "email", label: "Email" },
    { value: "website", label: "Website" },
    { value: "address", label: "Street Address" },
    { value: "city", label: "City" },
    { value: "zip", label: "ZIP Code" },
    { value: "description", label: "Description" },
    { value: "turnaroundTime", label: "Turnaround Time" },
    { value: "services", label: "Services Offered" },
    { value: "specialties", label: "Specialties" },
    { value: "other", label: "Other" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-muted-foreground hover:text-primary">
          <Pencil className="w-3 h-3" /> Suggest Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest Edit for {shopName}</DialogTitle>
        </DialogHeader>
        {!isSignedIn ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Please sign in to suggest edits. We track contributions to keep the directory accurate.
            </p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Link href="/sign-in"><Button size="sm" className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white">Sign In</Button></Link>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>What needs updating? *</Label>
            <Select value={field} onValueChange={setField}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                {editableFields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Correct information *</Label>
            <textarea
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm resize-none bg-background h-20"
              placeholder="Enter the correct information..."
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. I work here, confirmed via their website, etc."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!field || !newValue || editMutation.isPending}>
              {editMutation.isPending ? "Submitting..." : "Submit Suggestion"}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────── Shop Card ───────────────────── */

function ShopCard({ shop }: { shop: any }) {
  const hasServices = shop.services && shop.services.length > 0;

  return (
    <div className="rounded-lg border bg-card hover:border-[#E85D04]/40 transition-colors">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">{shop.name}</h2>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {shop.address && `${shop.address}, `}
                {shop.city}, {shop.state}
                {shop.zip && ` ${shop.zip}`}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <Stars rating={shop.avgRating ?? null} count={shop.ratingCount} />
            {shop.distanceMiles != null && (
              <p className="text-xs text-[#E85D04] font-semibold mt-1 flex items-center justify-end gap-1">
                <Navigation className="w-3 h-3" />
                {shop.distanceMiles.toFixed(1)} mi
              </p>
            )}
          </div>
        </div>

        {/* Specialties */}
        {shop.specialties && shop.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {shop.specialties.map((s: string) => (
              <span key={s} className="text-xs font-medium bg-[#E85D04]/10 text-[#E85D04] px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}

        {/* Description */}
        {shop.description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">{shop.description}</p>
        )}
      </div>

      {/* Services */}
      {hasServices && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Wrench className="w-3 h-3" />
            <span>Services</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shop.services.map((s: string) => (
              <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t bg-muted/30 rounded-b-lg">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {shop.phone && (
            <a href={`tel:${shop.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#E85D04] transition-colors">
              <Phone className="w-3.5 h-3.5" />{shop.phone}
            </a>
          )}
          {shop.email && (
            <a href={`mailto:${shop.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#E85D04] transition-colors">
              <Mail className="w-3.5 h-3.5" />{shop.email}
            </a>
          )}
          {shop.website && (
            <a href={shop.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#E85D04] transition-colors">
              <Globe className="w-3.5 h-3.5" />Website
            </a>
          )}
          {shop.turnaroundTime && shop.turnaroundTime !== "Contact for estimate" && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />{shop.turnaroundTime}
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <RateShopDialog shopId={shop.id} shopName={shop.name} />
            <SuggestEditDialog shopId={shop.id} shopName={shop.name} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Submit Shop Form ───────────────────── */

function SubmitShopForm() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const { toast } = useToast();
  const { isSignedIn } = useAuth();

  const submitMutation = useSubmitShop({
    mutation: {
      onSuccess: () => {
        setSubmitted(true);
        toast({ title: "Shop submitted!", description: "It will appear after review." });
      },
      onError: () => {
        toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
      },
    },
  });

  const toggleSpecialty = (s: string) =>
    setSelectedSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleService = (s: string) =>
    setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({
      data: {
        name: fields.name,
        address: fields.address,
        city: fields.city,
        state: fields.state,
        zip: fields.zip,
        phone: fields.phone,
        email: fields.email,
        website: fields.website,
        description: fields.description,
        specialties: selectedSpecialties,
        services: selectedServices,
        turnaroundTime: fields.turnaround || undefined,
      },
    });
  };

  return (
    <Card className="border-dashed border-2 border-[#E85D04]/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E85D04]/10 flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-[#E85D04]" />
            </div>
            <div>
              <CardTitle className="text-lg">Know a machine shop?</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Help the community by adding it to the directory.</p>
            </div>
          </div>
          <Button
            variant={showForm ? "outline" : "default"}
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className={showForm ? "" : "bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"}
          >
            {showForm ? "Cancel" : "Add a Shop"}
          </Button>
        </div>
      </CardHeader>
      {showForm && (
        <CardContent>
          {!isSignedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please sign in or create an account to submit a shop. We track submissions to keep the directory accurate.
              </p>
              <div className="flex gap-2">
                <Link href="/sign-in"><Button size="sm" className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white">Sign In</Button></Link>
                <Link href="/sign-up"><Button size="sm" variant="outline">Create Account</Button></Link>
              </div>
            </div>
          ) : submitted ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              Thank you! Your shop has been submitted for review and will appear in the directory once approved.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Shop Name *</Label>
                  <Input required value={fields.name ?? ""} onChange={e => setFields(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Bob's Engine Machine Shop" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Street Address</Label>
                  <Input value={fields.address ?? ""} onChange={e => setFields(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St" />
                </div>
                <div className="space-y-1">
                  <Label>City *</Label>
                  <Input required value={fields.city ?? ""} onChange={e => setFields(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>State *</Label>
                    <Select value={fields.state ?? ""} onValueChange={v => setFields(p => ({ ...p, state: v }))}>
                      <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>ZIP</Label>
                    <Input value={fields.zip ?? ""} onChange={e => setFields(p => ({ ...p, zip: e.target.value }))} placeholder="12345" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={fields.phone ?? ""} onChange={e => setFields(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={fields.email ?? ""} onChange={e => setFields(p => ({ ...p, email: e.target.value }))} placeholder="shop@example.com" />
                </div>
                <div className="space-y-1">
                  <Label>Website</Label>
                  <Input value={fields.website ?? ""} onChange={e => setFields(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
                </div>
                <div className="space-y-1">
                  <Label>Typical Turnaround</Label>
                  <Input value={fields.turnaround ?? ""} onChange={e => setFields(p => ({ ...p, turnaround: e.target.value }))} placeholder="e.g. 2-3 weeks" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Engine Specialties</Label>
                <div className="flex flex-wrap gap-2">
                  {specialtyOptions.map(s => (
                    <button
                      key={s} type="button" onClick={() => toggleSpecialty(s)}
                      className={`text-sm px-3 py-1 rounded-full border transition-colors ${selectedSpecialties.includes(s) ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-muted border-border hover:border-[#E85D04]/50"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Services Offered</Label>
                <div className="flex flex-wrap gap-2">
                  {serviceOptions.map(s => (
                    <button
                      key={s} type="button" onClick={() => toggleService(s)}
                      className={`text-sm px-3 py-1 rounded-full border transition-colors ${selectedServices.includes(s) ? "bg-[#E85D04] text-white border-[#E85D04]" : "bg-muted border-border hover:border-[#E85D04]/50"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <textarea
                  value={fields.description ?? ""}
                  onChange={e => setFields(p => ({ ...p, description: e.target.value }))}
                  className="w-full p-3 border rounded-lg text-sm resize-none bg-background h-20"
                  placeholder="What makes this shop stand out? Equipment, reputation, specialization..."
                />
              </div>
              <Button type="submit" disabled={submitMutation.isPending} className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white">
                {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
              </Button>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ───────────────────── Main Page ───────────────────── */

const RADIUS_OPTIONS = [20, 50, 100, 200, 500];

export default function ShopDirectory() {
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterService, setFilterService] = useState("");
  const [visibleCount, setVisibleCount] = useState(25);

  // Radius search state
  const [addressInput, setAddressInput] = useState("");
  const [radius, setRadius] = useState<number>(50);
  const [searchOrigin, setSearchOrigin] = useState<{ lat: number; lng: number; matched: string } | null>(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const handleGeocode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    setGeocodeLoading(true);
    setGeocodeError(null);
    try {
      const result = await geocodeAddress(addressInput);
      if (result.success && result.lat != null && result.lng != null) {
        setSearchOrigin({ lat: result.lat, lng: result.lng, matched: result.matched ?? addressInput });
        // Clear conflicting filters
        setFilterState("");
      } else {
        setGeocodeError(result.message ?? "Address not found");
      }
    } catch {
      setGeocodeError("Could not look up that address");
    } finally {
      setGeocodeLoading(false);
    }
  };

  const clearRadiusSearch = () => {
    setSearchOrigin(null);
    setAddressInput("");
    setGeocodeError(null);
  };

  const { data: shops, isLoading } = useGetShops({
    search: search || undefined,
    state: filterState || undefined,
    specialty: filterSpecialty || undefined,
    service: filterService || undefined,
    lat: searchOrigin?.lat,
    lng: searchOrigin?.lng,
    radius: searchOrigin ? radius : undefined,
  });

  const shopCount = shops?.length ?? 0;
  const visibleShops = (shops ?? []).slice(0, visibleCount);
  const hasMore = shopCount > visibleCount;

  return (
    <div>
      <SEOHead
        title="Machine Shop Directory"
        description="Find engine machine shops by location, specialty, and services. Community-rated directory of bore & hone, head porting, balancing, and full engine assembly shops."
        canonical="/shop-directory"
        keywords="engine machine shop, machine shop directory, engine rebuilder, bore and hone, head porting, balancing, engine building"
      />

      <PageHeader
        eyebrow="Shop Tools"
        title="Machine Shop Directory"
        subtitle="Find engine machine shops by location and specialty. All listings are community-submitted and rated — suggest edits to keep them accurate."
      />

      <div className="container mx-auto max-w-5xl py-8 px-4">
        {/* ── Find Near Me ── */}
        <Card className="mb-6 border-[#E85D04]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-4 h-4 text-[#E85D04]" />
              <h2 className="font-semibold text-sm">Find Shops Near You</h2>
              {searchOrigin && (
                <button
                  onClick={clearRadiusSearch}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <form onSubmit={handleGeocode} className="flex flex-wrap gap-2">
              <Input
                placeholder="Enter address, city, or ZIP code..."
                value={addressInput}
                onChange={e => setAddressInput(e.target.value)}
                className="flex-1 min-w-[220px]"
              />
              <Select value={String(radius)} onValueChange={v => setRadius(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map(r => (
                    <SelectItem key={r} value={String(r)}>{r} miles</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="submit"
                disabled={!addressInput.trim() || geocodeLoading}
                className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"
              >
                {geocodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
            </form>
            {geocodeError && (
              <p className="text-xs text-red-600 mt-2">{geocodeError}</p>
            )}
            {searchOrigin && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Searching within <strong>{radius} miles</strong> of <strong>{searchOrigin.matched}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name, city, or zip..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterState || "all"} onValueChange={v => setFilterState(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSpecialty || "all"} onValueChange={v => setFilterSpecialty(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {specialtyOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterService || "all"} onValueChange={v => setFilterService(v === "all" ? "" : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {serviceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* ── Active filter tags ── */}
        {(filterState || filterSpecialty || filterService) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">Filters:</span>
            {filterState && (
              <button onClick={() => setFilterState("")} className="text-xs bg-[#E85D04]/10 text-[#E85D04] px-2 py-0.5 rounded-full hover:bg-[#E85D04]/20 transition-colors">
                {filterState} &times;
              </button>
            )}
            {filterSpecialty && (
              <button onClick={() => setFilterSpecialty("")} className="text-xs bg-[#E85D04]/10 text-[#E85D04] px-2 py-0.5 rounded-full hover:bg-[#E85D04]/20 transition-colors">
                {filterSpecialty} &times;
              </button>
            )}
            {filterService && (
              <button onClick={() => setFilterService("")} className="text-xs bg-[#E85D04]/10 text-[#E85D04] px-2 py-0.5 rounded-full hover:bg-[#E85D04]/20 transition-colors">
                {filterService} &times;
              </button>
            )}
            <button
              onClick={() => { setFilterState(""); setFilterSpecialty(""); setFilterService(""); }}
              className="text-xs text-muted-foreground hover:text-foreground ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Results count ── */}
        {!isLoading && (
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {shopCount} shop{shopCount !== 1 ? "s" : ""} found
              {hasMore && ` (showing ${visibleCount})`}
            </span>
          </div>
        )}

        {/* ── Shop List ── */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        ) : shopCount === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No shops found matching your criteria.</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or add a shop you know about.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {visibleShops.map((shop: any) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}

        {/* ── Load more ── */}
        {hasMore && (
          <div className="flex justify-center mb-10">
            <Button variant="outline" onClick={() => setVisibleCount(c => c + 25)}>
              Show More ({shopCount - visibleCount} remaining)
            </Button>
          </div>
        )}

        {/* ── Submit Form ── */}
        <div className="mt-8">
          <SubmitShopForm />
        </div>
      </div>
    </div>
  );
}
