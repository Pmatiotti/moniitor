import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BenchmarkConfig {
  type: string;
  bcbCode: string;
}

const BENCHMARKS: BenchmarkConfig[] = [
  { type: 'CDI', bcbCode: '12' },       // Taxa CDI
  { type: 'IPCA', bcbCode: '433' },     // IPCA
  { type: 'SELIC', bcbCode: '432' },    // SELIC
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Iniciando busca de dados de benchmarks...')

    // Calcular data de início (12 meses atrás)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12)

    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }

    const start = formatDate(startDate)
    const end = formatDate(endDate)

    let totalInserted = 0
    let errors: string[] = []

    for (const benchmark of BENCHMARKS) {
      try {
        console.log(`Buscando dados do ${benchmark.type}...`)
        
        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${benchmark.bcbCode}/dados?formato=json&dataInicial=${start}&dataFinal=${end}`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar ${benchmark.type}: ${response.status}`)
        }

        const data = await response.json()
        console.log(`${benchmark.type}: ${data.length} registros encontrados`)

        // Inserir dados no Supabase
        for (const item of data) {
          const [day, month, year] = item.data.split('/')
          const date = `${year}-${month}-${day}`
          const value = parseFloat(item.valor)

          const { error } = await supabaseClient
            .from('benchmark_data')
            .upsert({
              benchmark_type: benchmark.type,
              date,
              value
            }, {
              onConflict: 'benchmark_type,date'
            })

          if (error) {
            console.error(`Erro ao inserir ${benchmark.type} para ${date}:`, error)
            errors.push(`${benchmark.type} ${date}: ${error.message}`)
          } else {
            totalInserted++
          }
        }
      } catch (err) {
        const error = err as Error;
        console.error(`Erro ao processar ${benchmark.type}:`, error)
        errors.push(`${benchmark.type}: ${error.message}`)
      }
    }

    console.log(`Concluído! ${totalInserted} registros inseridos`)

    return new Response(
      JSON.stringify({ 
        success: true,
        inserted: totalInserted,
        errors: errors.length > 0 ? errors : undefined,
        message: `${totalInserted} registros atualizados com sucesso`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error;
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
