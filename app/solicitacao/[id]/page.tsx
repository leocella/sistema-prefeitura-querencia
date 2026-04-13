import { createClient } from "@/lib/supabase/server"
import { calcularIdade } from "@/lib/calcularIdade"
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge"
import { Clock, Navigation, CheckCircle2, User, FileText } from "lucide-react"
import { SolicitacaoDetailClient } from "./SolicitacaoDetailClient"
import Link from "next/link"

export default async function SolicitacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Buscar solicitação com joins
  const { data: solicitacao, error } = await supabase
    .from('solicitacoes')
    .select(`
      *,
      pacientes (*),
      prestadores (nome),
      exames (*)
    `)
    .eq('id', id)
    .single()

  if (error || !solicitacao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <h1 className="text-xl text-slate-500">Solicitação não encontrada</h1>
      </div>
    )
  }

  const { pacientes, prestadores, exames } = solicitacao
  const paciente = Array.isArray(pacientes) ? pacientes[0] : pacientes
  const prestador = Array.isArray(prestadores) ? prestadores[0] : prestadores
  const idade = calcularIdade(paciente?.data_nascimento || new Date())

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm px-4 lg:px-8 h-16 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
          &larr; Voltar ao Dashboard
        </Link>
        <span className="text-slate-300">|</span>
        <h1 className="font-bold tracking-tight text-slate-800">Detalhes # {solicitacao.codigo_barras}</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Paciente Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm uppercase tracking-widest font-bold text-slate-400 mb-4">Dados do Paciente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">Nome Completo</p>
              <p className="font-bold text-lg text-slate-800">{paciente?.nome_completo}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Nascimento e Idade</p>
              <p className="font-semibold text-slate-800">
                {paciente?.data_nascimento ? new Date(paciente.data_nascimento).toLocaleDateString('pt-BR') : '--'} <span className="font-normal text-slate-500">· {idade} anos</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">CPF</p>
              <p className="font-semibold text-slate-800">{paciente?.cpf || 'Não informado'}</p>
            </div>
          </div>
        </div>

        {/* Info da solicitação e Botões interativos */}
          <SolicitacaoDetailClient 
          solicitacaoBase={solicitacao} 
          examesList={Array.isArray(exames) ? exames : (exames ? [exames] : [])} 
          prestadorNome={prestador?.nome || 'Prestador'} 
        />
        
      </main>
    </div>
  )
}
