import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PluggyConnect } from "./PluggyConnect";
import { PluggyConnections } from "./PluggyConnections";

interface PluggyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PluggyConnectionDialog = ({ open, onOpenChange }: PluggyConnectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Minhas Instituições Financeiras</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="connect" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connect">Conectar Nova</TabsTrigger>
            <TabsTrigger value="manage">Gerenciar Conexões</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connect" className="space-y-4">
            <PluggyConnect onConnectionSuccess={() => {}} />
          </TabsContent>
          
          <TabsContent value="manage" className="space-y-4">
            <PluggyConnections />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
