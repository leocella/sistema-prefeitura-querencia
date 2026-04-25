import { createClient } from "@/lib/supabase/server"
import { NovaSolicitacaoForm } from "./NovaSolicitacaoForm"

export default async function NovaSolicitacaoPage() {
  const supabase = await createClient()

  // Página pública — não exige login
  // O médico apenas gera/imprime o documento, não salva no banco

  const { data: prestadores } = await supabase
    .from('prestadores')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
              &larr; Dashboard
            </a>
            <span className="text-slate-300">|</span>
            <h1 className="font-bold tracking-tight text-slate-800 text-lg">
              Nova Solicitação de Exames
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <NovaSolicitacaoForm prestadores={prestadores || []} />
      </main>
    </div>
  )
}
