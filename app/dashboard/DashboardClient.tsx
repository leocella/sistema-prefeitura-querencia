"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase"
import { SolicitacaoCard } from "@/components/SolicitacaoCard"
import { StatusExame } from "@/components/StatusButtons"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

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

  const supabase = createClient()

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

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        
        {(role === 'admin' || role === 'hospital') && (
          <div className="flex-1 space-y-1">
            <Label className="text-slate-500">Laboratório</Label>
            <Select value={prestadorFilter} onValueChange={(v) => setPrestadorFilter(v || "todos")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {prestadores.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 space-y-1">
          <Label className="text-slate-500">Data Prevista</Label>
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div className="flex-1 space-y-1">
          <Label className="text-slate-500">Classificação</Label>
          <Select value={classFilter} onValueChange={(v) => setClassFilter(v || "todos")}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as classificações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="internamento">Internamento</SelectItem>
              <SelectItem value="emergencia">Emergência</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Lista de cards */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : solicitacoes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-slate-300">
          <p className="text-slate-500">Nenhuma solicitação encontrada para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solicitacoes.map((solicitacao) => (
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
