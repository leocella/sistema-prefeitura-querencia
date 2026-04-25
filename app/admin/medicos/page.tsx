import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MedicosClient } from "./MedicosClient"
import { ThemeToggle } from "@/components/ThemeToggle"
import Link from "next/link"

export default async function AdminMedicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar se é admin
  const { data: userData } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Buscar médicos
  const { data: medicos } = await supabase
    .from('medicos')
    .select('*')
    .order('nome')

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <header className="bg-white dark:bg-card border-b border-slate-200 dark:border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
              &larr; Dashboard
            </Link>
            <span className="text-slate-300 dark:text-border">|</span>
            <h1 className="font-bold tracking-tight text-slate-800 dark:text-foreground text-lg">
              Gestão de Médicos
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MedicosClient medicosIniciais={medicos || []} />
      </main>
    </div>
  )
}
