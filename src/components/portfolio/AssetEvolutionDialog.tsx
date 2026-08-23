import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssetEvolutionChart } from "./AssetEvolutionChart";

interface AssetEvolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    id: string;
    asset_name: string;
    invested_amount?: number | null;
    currency?: string | null;
  } | null;
}

export const AssetEvolutionDialog = ({ 
  open, 
  onOpenChange, 
  asset 
}: AssetEvolutionDialogProps) => {
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evolução do Ativo</DialogTitle>
        </DialogHeader>
        <AssetEvolutionChart
          assetId={asset.id}
          assetName={asset.asset_name}
          investedAmount={asset.invested_amount ? Number(asset.invested_amount) : undefined}
          currency={asset.currency || 'BRL'}
        />
      </DialogContent>
    </Dialog>
  );
};
