 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Star } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 
 interface StockWatchlistButtonProps {
   ticker: string;
   assetClass: string;
 }
 
 export function StockWatchlistButton({ ticker, assetClass }: StockWatchlistButtonProps) {
   const [inWatchlist, setInWatchlist] = useState(false);
   const [loading, setLoading] = useState(false);
   const { toast } = useToast();
 
   useEffect(() => {
     checkWatchlist();
   }, [ticker, assetClass]);
 
   const checkWatchlist = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) {
         setInWatchlist(false);
         return;
       }
 
       const { data, error } = await supabase
         .from("user_watchlists")
         .select("id")
         .eq("user_id", user.id)
         .eq("ticker", ticker.toUpperCase())
         .eq("asset_class", assetClass)
         .maybeSingle();
 
       if (error) throw error;
       setInWatchlist(!!data);
     } catch (err) {
       console.error("Erro ao verificar watchlist:", err);
     }
   };
 
   const toggleWatchlist = async () => {
     setLoading(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) {
         toast({
           title: "Faça login",
           description: "Você precisa estar logado para adicionar à watchlist.",
           variant: "destructive",
         });
         return;
       }
 
       if (inWatchlist) {
         // Remover
         const { error } = await supabase
           .from("user_watchlists")
           .delete()
           .eq("user_id", user.id)
           .eq("ticker", ticker.toUpperCase())
           .eq("asset_class", assetClass);
 
         if (error) throw error;
         setInWatchlist(false);
         toast({ title: "Removido da watchlist" });
       } else {
         // Adicionar
         const { error } = await supabase
           .from("user_watchlists")
           .insert({
             user_id: user.id,
             ticker: ticker.toUpperCase(),
             asset_class: assetClass,
           });
 
         if (error) throw error;
         setInWatchlist(true);
         toast({ title: "Adicionado à watchlist!" });
       }
     } catch (err: any) {
       console.error("Erro ao alterar watchlist:", err);
       toast({
         title: "Erro",
         description: err.message || "Não foi possível atualizar a watchlist.",
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Button
       variant={inWatchlist ? "default" : "outline"}
       size="sm"
       onClick={toggleWatchlist}
       disabled={loading}
       className="gap-2"
     >
       <Star className={`h-4 w-4 ${inWatchlist ? "fill-current" : ""}`} />
       {inWatchlist ? "Na Watchlist" : "Adicionar à Watchlist"}
     </Button>
   );
 }