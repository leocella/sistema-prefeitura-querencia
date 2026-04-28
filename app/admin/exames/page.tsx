import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExamesClient } from "./ExamesClient"
import { ThemeToggle } from "@/components/ThemeToggle"

export default async function AdminExamesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verifica se o usuário é admin
  const { data: userData } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: exames } = await supabase
    .from('catalogo_exames')
    .select('*')
    .order('destaque', { ascending: false })
    .order('nome', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <header className="bg-white dark:bg-card border-b border-slate-200 dark:border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-sm font-semibold text-primary hover:underline">
              &larr; Painel Admin
            </a>
            <span className="text-slate-300 dark:text-border">|</span>
            <h1 className="font-bold tracking-tight text-slate-800 dark:text-foreground text-lg">
              Gestão de Exames
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-foreground">Catálogo de Exames</h2>
          <p className="text-slate-500 dark:text-muted-foreground mt-1">
            Cadastre, edite e gerencie o catálogo de exames e seus valores.
          </p>
        </div>
        
        <ExamesClient examesIniciais={exames || []} />
      </main>
    </div>
  )
}
