import { useState } from "react";
import { useSuggestBrand } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb } from "lucide-react";

interface SuggestBrandModalProps {
  open: boolean;
  onClose: () => void;
}

export function SuggestBrandModal({ open, onClose }: SuggestBrandModalProps) {
  const [name, setName] = useState("");
  const { toast } = useToast();
  const suggest = useSuggestBrand();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    suggest.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Thanks! Your brand suggestion has been submitted for review." });
          setName("");
          onClose();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Something went wrong. Please try again.";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#99CC66]">
            <Lightbulb className="h-5 w-5" />
            Suggest a Brand
          </DialogTitle>
          <DialogDescription>
            Know a brand that should be listed here? Submit it for review and we'll add it if it fits.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Input
            autoFocus
            placeholder="Brand name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-2"
            data-testid="input-suggest-brand"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || suggest.isPending}
              className="font-bold"
              data-testid="button-submit-suggest-brand"
            >
              {suggest.isPending ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
