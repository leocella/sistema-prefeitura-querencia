"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2, Search, Clock, CheckCircle2, User, FlaskConical, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SolicitacaoLab {
  id: string
  codigo_barras: string
  paciente_nome: string
  medico_solicitante: string
  hora_prevista: string
  horario_coleta: string | null
  status: 'solicitado' | 'coletado' | 'liberado'
  classificacao: 'internamento' | 'emergencia'
  qtd_exames: number
  exames: { nome_exame: string }[]
}

interface Props {
  userRole: string
  prestadorId: string | null
}

export function LaboratorioClient({ userRole, prestadorId }: Props) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoLab[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"))

  const supabase = createClient()

  const fetchSolicitacoes = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('solicitacoes')
        .select(`
          id, codigo_barras, medico_solicitante, hora_prevista, horario_coleta, 
          status, classificacao, qtd_exames,
          pacientes (nome_completo),
          exames (nome_exame)
        `)
        .eq('data_prevista', dateFilter)
        .order('hora_prevista', { ascending: true })

      // Se for role laboratório, filtra pelo prestador dele. Admin vê todas.
      if (userRole === 'laboratorio' && prestadorId) {
        query = query.eq('prestador_id', prestadorId)
      }

      const { data, error } = await query

      if (error) throw error

      const formatadas = (data || []).map((s: any) => ({
        id: s.id,
        codigo_barras: s.codigo_barras,
        paciente_nome: Array.isArray(s.pacientes) ? s.pacientes[0]?.nome_completo : s.pacientes?.nome_completo,
        medico_solicitante: s.medico_solicitante,
        hora_prevista: s.hora_prevista,
        horario_coleta: s.horario_coleta,
        status: s.status,
        classificacao: s.classificacao,
        qtd_exames: s.qtd_exames,
        exames: s.exames || []
      }))

      setSolicitacoes(formatadas)
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar solicitações.")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, dateFilter, userRole, prestadorId])

  useEffect(() => {
    fetchSolicitacoes()
  }, [fetchSolicitacoes])

  useEffect(() => {
    const channel = supabase.channel('laboratorio_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, () => {
        fetchSolicitacoes() 
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchSolicitacoes])

  const solicitacoesFiltradas = solicitacoes.filter(s => {
    if (!busca.trim()) return true
    return s.paciente_nome.toLowerCase().includes(busca.toLowerCase()) || s.codigo_barras.includes(busca)
  })

  async function atualizarStatus(id: string, novoStatus: 'coletado' | 'liberado') {
    setSolicitacoes(prev => prev.map(s => s.id === id ? { ...s, status: novoStatus } : s))
    try {
      const { error } = await supabase.from('solicitacoes').update({ status: novoStatus }).eq('id', id)
      if (error) throw error
      toast.success(`Marcado como ${novoStatus === 'coletado' ? 'Coletado' : 'Liberado'}!`)
    } catch (error) {
      toast.error("Erro ao atualizar.")
      fetchSolicitacoes()
    }
  }

  // Ordenar para que emergências fiquem no topo
  const ordenadas = [...solicitacoesFiltradas].sort((a, b) => {
    if (a.classificacao === 'emergencia' && b.classificacao !== 'emergencia') return -1
    if (b.classificacao === 'emergencia' && a.classificacao !== 'emergencia') return 1
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-slate-200 dark:border-border flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por paciente ou código..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10 dark:bg-slate-900" />
        </div>
        <div className="w-full sm:w-48">
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="dark:bg-slate-900" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : ordenadas.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-card rounded-xl border border-dashed border-slate-300 dark:border-border">
          <p className="text-slate-500">Nenhuma solicitação encontrada para esta data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {ordenadas.map(solic => (
            <div key={solic.id} className={`bg-white dark:bg-card rounded-xl shadow-sm border overflow-hidden transition-all ${solic.classificacao === 'emergencia' ? 'border-red-300 dark:border-red-900/50' : 'border-slate-200 dark:border-border'}`}>
              <div className={`p-4 border-b ${solic.classificacao === 'emergencia' ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-border'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-500 font-mono tracking-wider">{solic.codigo_barras}</span>
                  {solic.classificacao === 'emergencia' && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> URGENTE</span>}
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-foreground line-clamp-1" title={solic.paciente_nome}>{solic.paciente_nome}</h3>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Coleta: <strong className="text-slate-800 dark:text-foreground">{solic.horario_coleta || solic.hora_prevista?.substring(0,5)}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="truncate" title={solic.medico_solicitante}>{solic.medico_solicitante}</span>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Exames ({solic.qtd_exames})</p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {solic.exames.map((ex, i) => (
                      <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded truncate max-w-full">
                        {ex.nome_exame}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-border flex gap-2">
                {solic.status === 'solicitado' && (
                  <Button onClick={() => atualizarStatus(solic.id, 'coletado')} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">
                    <FlaskConical className="w-4 h-4" /> Marcar como Coletado
                  </Button>
                )}
                {solic.status === 'coletado' && (
                  <Button onClick={() => atualizarStatus(solic.id, 'liberado')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Marcar como Liberado
                  </Button>
                )}
                {solic.status === 'liberado' && (
                  <div className="w-full text-center py-2 text-sm font-bold text-emerald-600 flex justify-center items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Liberado
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
