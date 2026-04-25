import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "./DashboardClient"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar dados da sessão/usuário
  const { data: userData } = await supabase
    .from('usuarios')
    .select('role, prestadores(nome, id)')
    .eq('id', user.id)
    .single()

  const role = userData?.role || 'admin'
  const prestador: any = userData?.prestadores

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold tracking-tight text-slate-800 text-lg hidden sm:block">
              Gestão de Exames 
              <span className="font-normal text-slate-400 ml-2"> Querência/MT</span>
            </h1>
            <h1 className="font-bold tracking-tight text-slate-800 text-lg sm:hidden">
              Exames
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/nova-solicitacao"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md shadow-blue-200 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Nova Solicitação</span>
              <span className="sm:hidden">Novo</span>
            </Link>
            <div className="text-right flex flex-col items-end">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {Array.isArray(prestador) ? prestador[0]?.nome : prestador?.nome || 'Administração Central'}
              </span>
              <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
            </div>
            {/* O logout estará no user menu no client */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardClient role={role} prestadorId={prestador?.id} />
      </main>
    </div>
  )
}
