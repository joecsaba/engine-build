import { useState } from "react";
import { useGetShops, useSubmitShop, useSubmitShopRating } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, Phone, Globe } from "lucide-react";

const specialtyOptions = ["LS", "SBC", "BBC", "Ford", "Mopar", "Import", "Diesel", "Balancing", "Full Engine Assembly"];
const states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

function Stars({ rating, count }: { rating: number | null; count: number }) {
  if (!rating) return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  return (
    <span className="flex items-center gap-1 text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
      ))}
      <span className="text-muted-foreground">{rating.toFixed(1)} ({count})</span>
    </span>
  );
}

export default function ShopDirectory() {
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitFields, setSubmitFields] = useState<Record<string, string>>({});
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { data: shops, isLoading } = useGetShops({
    search: search || undefined,
    state: filterState || undefined,
    specialty: filterSpecialty || undefined,
  });

  const submitMutation = useSubmitShop();

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMutation.mutateAsync({
      data: {
        name: submitFields.name,
        city: submitFields.city,
        state: submitFields.state,
        specialties: selectedSpecialties,
        turnaroundTime: submitFields.turnaround || "2-3 weeks",
        phone: submitFields.phone,
        website: submitFields.website,
        description: submitFields.description,
      }
    });
    setSubmitted(true);
  };

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Machine Shop Directory</h1>
        <p className="text-muted-foreground text-lg">Find engine machine shops by location and specialty. All listings are community-submitted and rated.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search shops..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-36"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All States</SelectItem>
            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Specialty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Specialties</SelectItem>
            {specialtyOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-4 mb-10">
          {(shops ?? []).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No shops found. Be the first to submit a shop in your area!</p>
            </div>
          )}
          {(shops ?? []).map(shop => (
            <div key={shop.id} className="p-5 rounded-lg border bg-card">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                <div>
                  <h2 className="text-xl font-bold">{shop.name}</h2>
                  <p className="text-muted-foreground">{shop.city}, {shop.state}</p>
                </div>
                <div className="text-right">
                  <Stars rating={shop.avgRating ?? null} count={shop.ratingCount} />
                  <p className="text-xs text-muted-foreground mt-1">Turnaround: {shop.turnaroundTime}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {shop.specialties.map(s => <span key={s} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s}</span>)}
              </div>
              {shop.description && <p className="text-sm text-muted-foreground mb-2">{shop.description}</p>}
              <div className="flex gap-4 text-sm text-muted-foreground">
                {shop.phone && <a href={`tel:${shop.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" />{shop.phone}</a>}
                {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="w-3 h-3" />Website</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Submit Your Machine Shop</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowSubmit(!showSubmit)}>
              {showSubmit ? "Hide Form" : "Submit a Shop"}
            </Button>
          </div>
        </CardHeader>
        {showSubmit && (
          <CardContent>
            {submitted ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                Thank you! Your shop has been submitted for review and will appear in the directory once approved.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Shop Name *</Label>
                    <Input required value={submitFields.name ?? ""} onChange={e => setSubmitFields(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>City *</Label>
                    <Input required value={submitFields.city ?? ""} onChange={e => setSubmitFields(p => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>State *</Label>
                    <Select value={submitFields.state ?? ""} onValueChange={v => setSubmitFields(p => ({ ...p, state: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Typical Turnaround Time</Label>
                    <Input placeholder="e.g. 2-3 weeks" value={submitFields.turnaround ?? ""} onChange={e => setSubmitFields(p => ({ ...p, turnaround: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={submitFields.phone ?? ""} onChange={e => setSubmitFields(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Website</Label>
                    <Input placeholder="https://" value={submitFields.website ?? ""} onChange={e => setSubmitFields(p => ({ ...p, website: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Specialties *</Label>
                  <div className="flex flex-wrap gap-2">
                    {specialtyOptions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSpecialty(s)}
                        className={`text-sm px-3 py-1 rounded-full border transition-colors ${selectedSpecialties.includes(s) ? "bg-primary text-white border-primary" : "bg-muted border-border hover:border-primary/50"}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <textarea
                    value={submitFields.description ?? ""}
                    onChange={e => setSubmitFields(p => ({ ...p, description: e.target.value }))}
                    className="w-full p-3 border rounded-lg text-sm resize-none bg-background h-20"
                    placeholder="What makes your shop stand out?"
                  />
                </div>
                <Button type="submit" disabled={submitMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
                  {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
                </Button>
              </form>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
