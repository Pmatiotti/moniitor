import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Client } from "@/pages/CRM";
import { ClientDetailsContent } from "./ClientDetailsContent";
import { EditClientDialog } from "./EditClientDialog";

interface ClientDetailsPanelProps {
  client: Client;
  onClose: () => void;
  onClientUpdated?: () => void;
}

export const ClientDetailsPanel = ({ client, onClose, onClientUpdated }: ClientDetailsPanelProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditSuccess = () => {
    onClientUpdated?.();
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[800px] bg-background border-l shadow-2xl overflow-y-auto z-50">
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b">
          <div className="p-4 flex items-center justify-end">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <ClientDetailsContent 
          client={client} 
          onEdit={() => setEditDialogOpen(true)} 
        />
      </div>

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={client}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};
