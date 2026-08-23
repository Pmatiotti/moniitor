import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockSuggestion {
  ticker: string;
  name: string;
  logo: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [], error: "Query must be at least 2 characters" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BRAPI_API_KEY = Deno.env.get('BRAPI_API_KEY');
    
    if (!BRAPI_API_KEY) {
      console.error("BRAPI_API_KEY not configured");
      return new Response(
        JSON.stringify({ suggestions: [], error: "Service temporarily unavailable" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Use BRAPI's search endpoint
    const searchUrl = `https://brapi.dev/api/quote/list?search=${encodeURIComponent(query)}&limit=10&token=${BRAPI_API_KEY}`;
    
    console.log(`Searching BRAPI for: ${query}`);
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      console.error(`BRAPI search failed: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ suggestions: [], error: "Search failed" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    console.log(`BRAPI returned ${data.stocks?.length || 0} results`);

    // Filter out fractional tickers (e.g., PETR4F, VALE3F, HGLG11F)
    const isFractionalTicker = (ticker: string): boolean => {
      return /\d+F$/i.test(ticker);
    };

    const suggestions: StockSuggestion[] = (data.stocks || [])
      .filter((stock: any) => !isFractionalTicker(stock.stock))
      .map((stock: any) => ({
        ticker: stock.stock,
        name: stock.name || stock.stock,
        logo: stock.logo || `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${stock.stock.replace(/\d+$/, '')}.png`
      }));

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error in search-stocks:", error);
    return new Response(
      JSON.stringify({ suggestions: [], error: "Search failed" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
