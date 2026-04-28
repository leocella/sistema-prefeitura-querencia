"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, ExternalLink } from "lucide-react"

import { createClient } from "@/lib/supabase"
import { StatusButtons, StatusExame } from "@/components/StatusButtons"
import { LaudoUpload } from "@/components/LaudoUpload"
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface SolicitacaoDetailClientProps {
  solicitacaoBase: any
  examesList: any[]
  prestadorNome: string
}

export function SolicitacaoDetailClient({ solicitacaoBase, examesList, prestadorNome }: SolicitacaoDetailClientProps) {
  const [solicitacao, setSolicitacao] = useState(solicitacaoBase)
  const [exames, setExames] = useState(examesList)
  const router = useRouter()
  const supabase = createClient()

  // Change overall status
  const handleStatusChange = async (newStatus: StatusExame) => {
    // Validação de laudo removida a pedido do usuário
    setSolicitacao((prev: any) => ({ ...prev, status: newStatus }))

    try {
      const { error } = await supabase
        .from('solicitacoes')
        .update({ status: newStatus })
        .eq('id', solicitacao.id)

      if (error) throw error
      toast.success("Status atualizado com sucesso!")
      router.refresh()
    } catch (error) {
      toast.error("Erro ao atualizar o status.")
      setSolicitacao(solicitacaoBase)
    }
  }

  // Toggle individual exam checkbox
  const toggleExame = async (exameId: string, atualizouPara: boolean) => {
    setExames(prev => prev.map(e => e.id === exameId ? { ...e, realizado: atualizouPara } : e))

    try {
      const { error } = await supabase
        .from('exames')
        .update({ realizado: atualizouPara })
        .eq('id', exameId)

      if (error) throw error
    } catch (error) {
      toast.error("Erro ao salvar status do exame.")
      // Revert state on error
      setExames(prev => prev.map(e => e.id === exameId ? { ...e, realizado: !atualizouPara } : e))
    }
  }

  return (
    <div className="space-y-6">
      {/* Solicitação Info */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-sm uppercase tracking-widest font-bold text-slate-400 dark:text-muted-foreground">Dados da Solicitação</h2>
          <ClassificacaoBadge classificacao={solicitacao.classificacao} />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="text-slate-500 dark:text-muted-foreground mb-1">Médico Solicitante</p>
            <p className="font-semibold text-slate-800 dark:text-foreground">{solicitacao.medico_solicitante}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-muted-foreground mb-1">Origem</p>
            <p className="font-semibold text-slate-800 dark:text-foreground">{solicitacao.solicitante_origem}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-muted-foreground mb-1">Prestador</p>
            <p className="font-semibold text-slate-800 dark:text-foreground">{prestadorNome}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-muted-foreground mb-1">Data / Hora</p>
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-foreground">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>
                {new Date(solicitacao.data_prevista).toLocaleDateString('pt-BR')} às {solicitacao.hora_prevista?.substring(0,5)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <h3 className="text-center text-sm font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-widest mb-4">Controle de Status</h3>
          <StatusButtons 
            currentStatus={solicitacao.status} 
            onChangeStatus={handleStatusChange} 
            className="h-16" 
          />
        </div>
      </div>

      {/* Exames List */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-sm uppercase tracking-widest font-bold text-slate-400 dark:text-muted-foreground">Exames Solicitados ({exames.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {exames.map((exame) => (
            <div key={exame.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800 dark:text-foreground">{exame.nome_exame}</span>
                <span className="text-xs text-slate-400 dark:text-muted-foreground">Código SUS: {exame.codigo_procedimento}</span>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor={`exame-${exame.id}`} className="text-sm font-medium text-slate-600 cursor-pointer">Realizado</label>
                <Checkbox 
                  id={`exame-${exame.id}`} 
                  checked={exame.realizado} 
                  onCheckedChange={(checked) => toggleExame(exame.id, checked as boolean)}
                  className="w-5 h-5 rounded-md border-slate-300 data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Laudo Area - Oculto temporariamente */}
    </div>
  )
}
