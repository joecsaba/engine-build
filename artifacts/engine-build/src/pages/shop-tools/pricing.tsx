import { useState } from "react";
import { useGetShopPricing, useSubmitShopPricing } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ShopPricing() {
  const { data: pricing, isLoading } = useGetShopPricing();
  const submitMutation = useSubmitShopPricing();
  const [service, setService] = useState("");
  const [price, setPrice] = useState("");
  const [region, setRegion] = useState("");
  const [shopName, setShopName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const grouped = (pricing ?? []).reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, typeof pricing extends (infer T)[] ? T[] : never[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !price || !region) return;
    await submitMutation.mutateAsync({ data: { service, price: parseInt(price), region, shopName } });
    setSubmitted(true);
  };

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Machine Shop Pricing Guide</h1>
        <p className="text-muted-foreground text-lg">Community-sourced pricing benchmarks for common engine machine work. Updated with shop-submitted data. Prices vary significantly by region.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-8 mb-12">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-xl font-bold mb-4 pb-2 border-b">{category}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 border font-semibold">Service</th>
                      <th className="text-left p-3 border font-semibold">Unit</th>
                      <th className="text-right p-3 border font-semibold text-green-700">Low</th>
                      <th className="text-right p-3 border font-semibold text-blue-700">Average</th>
                      <th className="text-right p-3 border font-semibold text-orange-700">High</th>
                      <th className="text-left p-3 border font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                        <td className="p-3 border font-medium">{item.service}</td>
                        <td className="p-3 border text-muted-foreground">{item.unit}</td>
                        <td className="text-right p-3 border text-green-700 font-mono">${item.lowPrice}</td>
                        <td className="text-right p-3 border text-blue-700 font-mono font-bold">${item.avgPrice}</td>
                        <td className="text-right p-3 border text-orange-700 font-mono">${item.highPrice}</td>
                        <td className="p-3 border text-muted-foreground text-xs">{item.notes ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-8">
        <strong>Note:</strong> These prices are community-submitted and represent general market ranges. Machine shop prices vary 2x or more between rural and major metro areas. Always get multiple quotes. Quality work is worth paying for — the cheapest shop is rarely the best value when rebuilding an engine.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Your Shop's Prices</CardTitle>
          <p className="text-sm text-muted-foreground">Help other builders by submitting your shop's rates. Data is reviewed before publication.</p>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              Thank you for submitting pricing data! It will be reviewed and added to the database.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Service</Label>
                <Input placeholder="e.g. Bore and Hone" value={service} onChange={e => setService(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Your Price ($)</Label>
                <Input type="number" placeholder="e.g. 250" value={price} onChange={e => setPrice(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Region / City, State</Label>
                <Input placeholder="e.g. Dallas, TX" value={region} onChange={e => setRegion(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Shop Name (optional)</Label>
                <Input placeholder="e.g. Bob's Engine Works" value={shopName} onChange={e => setShopName(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
                  {submitMutation.isPending ? "Submitting..." : "Submit Pricing Data"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
