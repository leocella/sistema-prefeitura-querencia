"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase"
import { SolicitacaoCard } from "@/components/SolicitacaoCard"
import { StatusExame } from "@/components/StatusButtons"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Search, LogOut, ClipboardList, FlaskConical, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface DashboardClientProps {
  role: string
  prestadorId?: string
}

export function DashboardClient({ role, prestadorId }: DashboardClientProps) {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([])
  const [prestadores, setPrestadores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"))
  const [classFilter, setClassFilter] = useState("todos")
  const [prestadorFilter, setPrestadorFilter] = useState("todos")
  const [buscaPaciente, setBuscaPaciente] = useState("")

  const supabase = createClient()
  const router = useRouter()

  const fetchDados = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // 1. Fetch Prestadores for the filter (if admin or hospital)
      if (role === 'admin' || role === 'hospital') {
        const { data: prestadoresData } = await supabase.from('prestadores').select('id, nome').eq('ativo', true)
        if (prestadoresData) setPrestadores(prestadoresData)
      }

      // 2. Fetch Solicitações
      let query = supabase
        .from('solicitacoes')
        .select(`
          id, codigo_barras, hora_prevista, medico_solicitante, 
          solicitante_origem, qtd_exames, classificacao, status,
          prestador_id,
          pacientes (nome_completo)
        `)
        .eq('data_prevista', dateFilter)
        .order('hora_prevista', { ascending: true })

      if (classFilter !== 'todos') {
        query = query.eq('classificacao', classFilter)
      }

      // RLS already handles permissions, but we can filter visually
      // If role is admin and they selected a provider to filter
      if ((role === 'admin' || role === 'hospital') && prestadorFilter !== 'todos') {
        query = query.eq('prestador_id', prestadorFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setSolicitacoes(data || [])
    } catch (error) {
      const err = error as any
      toast.error(err?.message || "Erro ao buscar as solicitações.")
      console.error("Supabase Error Details:", JSON.stringify(error, null, 2))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, role, dateFilter, classFilter, prestadorFilter])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  // Set up Realtime Subscription
  useEffect(() => {
    const channel = supabase.channel('solicitacoes_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'solicitacoes' 
      }, (payload) => {
        // Refetch or update optimistic state on payload
        fetchDados() 
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchDados])

  // Handle Status Update
  const handleStatusChange = async (id: string, newStatus: StatusExame) => {
    // Optimistic UI update
    setSolicitacoes((prev) => 
      prev.map(s => s.id === id ? { ...s, status: newStatus } : s)
    )

    try {
      const { error } = await supabase
        .from('solicitacoes')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      toast.success("Status atualizado com sucesso!")
    } catch (error) {
      toast.error("Erro ao atualizar status.")
      fetchDados() // Revert local state by fetching real state
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Contadores de status
  const contadores = useMemo(() => {
    const solicitados = solicitacoes.filter(s => s.status === 'solicitado').length
    const coletados = solicitacoes.filter(s => s.status === 'coletado').length
    const liberados = solicitacoes.filter(s => s.status === 'liberado').length
    return { solicitados, coletados, liberados, total: solicitacoes.length }
  }, [solicitacoes])

  // Filtro local por nome do paciente
  const solicitacoesFiltradas = useMemo(() => {
    if (!buscaPaciente.trim()) return solicitacoes
    const termo = buscaPaciente.toLowerCase()
    return solicitacoes.filter(s => {
      const nome = Array.isArray(s.pacientes) ? s.pacientes[0]?.nome_completo : s.pacientes?.nome_completo
      return nome?.toLowerCase().includes(termo)
    })
  }, [solicitacoes, buscaPaciente])

  return (
    <div className="space-y-4">
      {/* Botão Logout */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-slate-200 dark:border-border flex flex-col md:flex-row gap-4">
        
        {(role === 'admin' || role === 'hospital') && (
          <div className="flex-1 space-y-1">
            <Label className="text-slate-500 dark:text-muted-foreground">Laboratório</Label>
            <select
              value={prestadorFilter}
              onChange={(e) => setPrestadorFilter(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-input/30 dark:text-foreground"
            >
              <option value="todos">Todos os Laboratórios</option>
              {prestadores.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 space-y-1">
          <Label className="text-slate-500 dark:text-muted-foreground">Data Prevista</Label>
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="dark:bg-input/30"
          />
        </div>

        <div className="flex-1 space-y-1">
          <Label className="text-slate-500 dark:text-muted-foreground">Classificação</Label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-input/30 dark:text-foreground"
          >
            <option value="todos">Todas</option>
            <option value="internamento">🏥 Internamento</option>
            <option value="emergencia">🚨 Emergência</option>
          </select>
        </div>

      </div>

      {/* Busca por paciente */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar paciente pelo nome..."
          value={buscaPaciente}
          onChange={(e) => setBuscaPaciente(e.target.value)}
          className="pl-10 bg-white dark:bg-card h-10"
        />
      </div>

      {/* Contadores de Status */}
      {!isLoading && solicitacoes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-muted flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-foreground">{contadores.solicitados}</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">Solicitados</p>
            </div>
          </div>
          <div className="bg-white dark:bg-card rounded-xl border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{contadores.coletados}</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">Coletados</p>
            </div>
          </div>
          <div className="bg-white dark:bg-card rounded-xl border border-green-200 dark:border-green-800 p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{contadores.liberados}</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">Liberados</p>
            </div>
          </div>
          <div className="bg-white dark:bg-card rounded-xl border border-blue-200 dark:border-blue-800 p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-500">#</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{contadores.total}</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de cards */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : solicitacoesFiltradas.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-card rounded-xl shadow-sm border border-dashed border-slate-300 dark:border-border">
          <p className="text-slate-500">
            {buscaPaciente.trim()
              ? `Nenhum paciente encontrado para "${buscaPaciente}".`
              : "Nenhuma solicitação encontrada para os filtros selecionados."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solicitacoesFiltradas.map((solicitacao) => (
            <SolicitacaoCard 
              key={solicitacao.id} 
              solicitacao={solicitacao} 
              onStatusChange={handleStatusChange} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
