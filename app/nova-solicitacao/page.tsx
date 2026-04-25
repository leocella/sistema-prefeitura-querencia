import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NovaSolicitacaoForm } from "./NovaSolicitacaoForm"
import { ThemeToggle } from "@/components/ThemeToggle"

export default async function NovaSolicitacaoPage() {
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
        <NovaSolicitacaoForm prestadores={prestadores || []} />
      </main>
    </div>
  )
}
