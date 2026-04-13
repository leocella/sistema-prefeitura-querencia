"use client"
import Link from "next/link"
import { Clock, User } from "lucide-react"

import { Card } from "@/components/ui/card"
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge"
import { StatusButtons, StatusExame } from "@/components/StatusButtons"

interface SolicitacaoCardProps {
  solicitacao: {
    id: string
    codigo_barras: string
    hora_prevista: string
    medico_solicitante: string
    solicitante_origem: string
    qtd_exames: number
    classificacao: 'internamento' | 'emergencia'
    status: StatusExame
    pacientes: {
      nome_completo: string
    }
  }
  onStatusChange?: (id: string, newStatus: StatusExame) => void
  disabled?: boolean
}

export function SolicitacaoCard({ solicitacao, onStatusChange, disabled }: SolicitacaoCardProps) {
  // Format time (assuming "HH:MM:SS" from db)
  const horaFormatada = solicitacao.hora_prevista
    ? solicitacao.hora_prevista.substring(0, 5)
    : '--:--'

  return (
    <Card className="hover:shadow-lg hover:border-slate-300 transition-all duration-300 bg-white/70 backdrop-blur-md relative overflow-hidden group">
      {/* Decorative gradient based on status */}
      <div className={`absolute top-0 left-0 w-1 h-full ${
        solicitacao.status === 'solicitado' ? 'bg-slate-400' :
        solicitacao.status === 'coletado' ? 'bg-amber-500' : 'bg-green-500'
      }`} />

      <div className="p-5">
        <Link href={`/solicitacao/${solicitacao.id}`} className="block">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                {solicitacao.codigo_barras}
              </span>
              <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {Array.isArray(solicitacao.pacientes) ? solicitacao.pacientes[0]?.nome_completo : solicitacao.pacientes?.nome_completo}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ClassificacaoBadge classificacao={solicitacao.classificacao} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4 text-sm text-foreground/80 mt-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{horaFormatada}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="truncate text-right">{solicitacao.medico_solicitante}</span>
            </div>
            <div className="col-span-2 flex justify-between text-muted-foreground bg-muted/40 p-2 rounded-md mt-2">
              <span className="truncate font-medium">{solicitacao.solicitante_origem}</span>
              <span className="whitespace-nowrap font-medium text-primary">
                {solicitacao.qtd_exames} {solicitacao.qtd_exames === 1 ? 'exame' : 'exames'}
              </span>
            </div>
          </div>
        </Link>
        
        {/* Buttons independent from the link to allow interactions without navigation */}
        <StatusButtons 
          currentStatus={solicitacao.status} 
          disabled={disabled}
          onChangeStatus={(newStatus) => onStatusChange && onStatusChange(solicitacao.id, newStatus)}
          className="mt-2"
        />
      </div>
    </Card>
  )
}
