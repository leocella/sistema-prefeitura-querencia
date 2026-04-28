import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NovaSolicitacaoForm } from "./NovaSolicitacaoForm"
import { ThemeToggle } from "@/components/ThemeToggle"

interface PageProps {
  searchParams: Promise<{ paciente_id?: string }>
}

export default async function NovaSolicitacaoPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: prestadores } = await supabase
    .from('prestadores')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  const { data: medicos } = await supabase
    .from('medicos')
    .select('id, nome, crm, especialidade')
    .eq('ativo', true)
    .order('nome')

  // Se veio com paciente_id, buscar dados do paciente
  let pacientePreCarregado = null
  if (params.paciente_id) {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome_completo, data_nascimento, cpf')
      .eq('id', params.paciente_id)
      .single()
    pacientePreCarregado = data
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <header className="bg-white dark:bg-card border-b border-slate-200 dark:border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
              &larr; Dashboard
            </a>
            <span className="text-slate-300 dark:text-border">|</span>
            <h1 className="font-bold tracking-tight text-slate-800 dark:text-foreground text-lg">
              Nova Solicitação de Exames
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <NovaSolicitacaoForm
          prestadores={prestadores || []}
          medicos={medicos || []}
          pacientePreCarregado={pacientePreCarregado}
        />
      </main>
    </div>
  )
}
