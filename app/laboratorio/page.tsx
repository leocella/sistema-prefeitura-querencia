import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LaboratorioClient } from "./LaboratorioClient"
import { ThemeToggle } from "@/components/ThemeToggle"
import { LogOut } from "lucide-react"

export default async function LaboratorioPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar se o usuário tem acesso (laboratorio ou admin)
  const { data: userData } = await supabase
    .from('usuarios')
    .select('role, prestador_id')
    .eq('id', user.id)
    .single()

  if (!userData || (userData.role !== 'laboratorio' && userData.role !== 'admin')) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <header className="bg-white dark:bg-card border-b border-slate-200 dark:border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center rounded-lg font-bold">L</div>
            <h1 className="font-bold tracking-tight text-slate-800 dark:text-foreground text-lg">
              Portal do Laboratório
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button className="text-slate-500 hover:text-red-600 flex items-center gap-2 text-sm font-medium">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-foreground">Solicitações Pendentes</h2>
          <p className="text-slate-500 dark:text-muted-foreground mt-1">
            Gerencie as coletas e liberações de exames recebidos.
          </p>
        </div>
        
        <LaboratorioClient userRole={userData.role} prestadorId={userData.prestador_id} />
      </main>
    </div>
  )
}
