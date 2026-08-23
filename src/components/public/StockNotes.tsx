 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Textarea } from "@/components/ui/textarea";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Save, FileText } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import { useDebounce } from "@/hooks/useDebounce";
 
 interface StockNotesProps {
   ticker: string;
   assetClass: string;
 }
 
 export function StockNotes({ ticker, assetClass }: StockNotesProps) {
   const [note, setNote] = useState("");
   const [status, setStatus] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [isLoggedIn, setIsLoggedIn] = useState(false);
   const { toast } = useToast();
   const debouncedNote = useDebounce(note, 1000);
 
   useEffect(() => {
     checkAuth();
   }, []);
 
   useEffect(() => {
     if (isLoggedIn) {
       loadNote();
     }
   }, [ticker, assetClass, isLoggedIn]);
 
   useEffect(() => {
     if (isLoggedIn && debouncedNote !== null) {
       saveNote();
     }
   }, [debouncedNote]);
 
   const checkAuth = async () => {
     const { data: { user } } = await supabase.auth.getUser();
     setIsLoggedIn(!!user);
   };
 
   const loadNote = async () => {
     setLoading(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       const { data, error } = await supabase
         .from("user_stock_notes")
         .select("note, status")
         .eq("user_id", user.id)
         .eq("ticker", ticker.toUpperCase())
         .eq("asset_class", assetClass)
         .maybeSingle();
 
       if (error) throw error;
       if (data) {
         setNote(data.note || "");
         setStatus(data.status);
       }
     } catch (err) {
       console.error("Erro ao carregar nota:", err);
     } finally {
       setLoading(false);
     }
   };
 
   const saveNote = async () => {
     setSaving(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       const { error } = await supabase
         .from("user_stock_notes")
         .upsert({
           user_id: user.id,
           ticker: ticker.toUpperCase(),
           asset_class: assetClass,
           note: debouncedNote,
           status,
         }, {
           onConflict: "user_id,ticker,asset_class",
         });
 
       if (error) throw error;
     } catch (err: any) {
       console.error("Erro ao salvar nota:", err);
       toast({
         title: "Erro ao salvar",
         description: err.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   };
 
   const updateStatus = async (newStatus: string) => {
     setStatus(newStatus);
     setSaving(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       const { error } = await supabase
         .from("user_stock_notes")
         .upsert({
           user_id: user.id,
           ticker: ticker.toUpperCase(),
           asset_class: assetClass,
           note,
           status: newStatus,
         }, {
           onConflict: "user_id,ticker,asset_class",
         });
 
       if (error) throw error;
       toast({ title: "Status atualizado!" });
     } catch (err: any) {
       console.error("Erro ao atualizar status:", err);
       toast({
         title: "Erro",
         description: err.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   };
 
   if (!isLoggedIn) return null;
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <FileText className="h-5 w-5" />
           Minhas Notas
           {saving && <span className="text-xs text-muted-foreground">(salvando...)</span>}
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="flex gap-2 flex-wrap">
           <Badge
             variant={status === "acompanhar" ? "default" : "outline"}
             className="cursor-pointer"
             onClick={() => updateStatus("acompanhar")}
           >
             Acompanhar
           </Badge>
           <Badge
             variant={status === "comprar" ? "default" : "outline"}
             className="cursor-pointer"
             onClick={() => updateStatus("comprar")}
           >
             Comprar
           </Badge>
           <Badge
             variant={status === "evitar" ? "default" : "outline"}
             className="cursor-pointer"
             onClick={() => updateStatus("evitar")}
           >
             Evitar
           </Badge>
         </div>
 
         <Textarea
           placeholder="Escreva suas anotações, teses de investimento ou gatilhos de compra/venda..."
           value={note}
           onChange={(e) => setNote(e.target.value)}
           rows={6}
           disabled={loading}
         />
       </CardContent>
     </Card>
   );
 }