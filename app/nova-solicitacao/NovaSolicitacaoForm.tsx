"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Printer, Search, FileText, User, Stethoscope, Check, Loader2, History, ArrowRight, ArrowLeft, Plus, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { calcularIdade } from "@/lib/calcularIdade"
import { format } from "date-fns"

interface Medico {
  id: string
  nome: string
  crm: string
  especialidade: string | null
}

interface CatalogoExame {
  id: string
  nome: string
  codigo: string | null
  valor: number
  destaque: boolean
}

interface SelectedExame {
  nome: string
  codigo: string | null
  valor: number
}

interface PacientePreCarregado {
  id: string
  nome_completo: string
  data_nascimento: string
  cpf: string | null
}

interface Props {
  prestadores: { id: string; nome: string }[]
  medicos: Medico[]
  pacientePreCarregado?: PacientePreCarregado | null
}

const HORARIOS_COLETA = ["09:00", "14:00", "18:00", "20:30", "23:30", "🚨 Emergência — Coletar Agora"]

export function NovaSolicitacaoForm({ prestadores, medicos, pacientePreCarregado }: Props) {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(pacientePreCarregado ? 2 : 1)
  
  // ── Data ──
  const [catalogo, setCatalogo] = useState<CatalogoExame[]>([])
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(true)

  // ── Patient data (Etapa 1) ──
  const [nomePaciente, setNomePaciente] = useState(pacientePreCarregado?.nome_completo || "")
  const [dataNascimento, setDataNascimento] = useState(pacientePreCarregado?.data_nascimento || "")
  const [cpf, setCpf] = useState(pacientePreCarregado?.cpf || "")
  const [pacienteId, setPacienteId] = useState<string | null>(pacientePreCarregado?.id || null)
  
  // ── History ──
  const idadeCalculada = dataNascimento ? calcularIdade(dataNascimento) : null
  const [historicoCount, setHistoricoCount] = useState(0)
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)

  // ── Exams (Etapa 2) ──
  const [selecionados, setSelecionados] = useState<SelectedExame[]>([])
  const [buscaExame, setBuscaExame] = useState("")
  const [novoExameLivre, setNovoExameLivre] = useState("")

  // ── Solicitacao (Etapa 3) ──
  const [classificacao, setClassificacao] = useState<"internamento" | "emergencia">("internamento")
  const [medicoSolicitante, setMedicoSolicitante] = useState("")
  const [prestadorId, setPrestadorId] = useState("")
  const [horarioColeta, setHorarioColeta] = useState("09:00")
  
  // ── Medico search ──
  const [buscaMedico, setBuscaMedico] = useState("")
  const [showMedicoDropdown, setShowMedicoDropdown] = useState(false)

  // ── Print ref & State ──
  const printRef = useRef<HTMLDivElement>(null)
  const [gerado, setGerado] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingPaciente, setIsSavingPaciente] = useState(false)
  const [codigoBarras, setCodigoBarras] = useState("")

  const supabase = createClient()

  // ── Fetch Catalogo ──
  useEffect(() => {
    async function fetchCatalogo() {
      setIsLoadingCatalogo(true)
      const { data, error } = await supabase
        .from('catalogo_exames')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (data) setCatalogo(data)
      setIsLoadingCatalogo(false)
    }
    fetchCatalogo()
  }, [supabase])

  // ── Filtered exams ──
  const catalogoFiltrado = useMemo(() => {
    if (!buscaExame.trim()) return catalogo
    const termo = buscaExame.toLowerCase()
    return catalogo.filter((e) => e.nome.toLowerCase().includes(termo) || (e.codigo && e.codigo.toLowerCase().includes(termo)))
  }, [buscaExame, catalogo])

  const examesDestaque = catalogoFiltrado.filter(e => e.destaque)
  const examesNormais = catalogoFiltrado.filter(e => !e.destaque)

  const valorTotalSelecionados = selecionados.reduce((acc, curr) => acc + (curr.valor || 0), 0)

  // ── Effects ──
  useEffect(() => {
    async function checkHistorico() {
      const rawCpf = cpf.replace(/\D/g, "")
      if (rawCpf.length === 11) {
        setIsLoadingHistorico(true)
        try {
          const { data: paciente } = await supabase
            .from("pacientes")
            .select("id, nome_completo, data_nascimento")
            .eq("cpf", cpf)
            .maybeSingle()

          if (paciente) {
            if (!nomePaciente) setNomePaciente(paciente.nome_completo)
            if (!dataNascimento) setDataNascimento(paciente.data_nascimento)
            setPacienteId(paciente.id)

            const { count } = await supabase
              .from("solicitacoes")
              .select("*", { count: "exact", head: true })
              .eq("paciente_id", paciente.id)

            setHistoricoCount(count || 0)
          } else {
            setHistoricoCount(0)
            setPacienteId(null)
          }
        } finally {
          setIsLoadingHistorico(false)
        }
      } else {
        setHistoricoCount(0)
        setPacienteId(null)
      }
    }
    checkHistorico()
  }, [cpf, supabase, nomePaciente, dataNascimento])

  // ── Handlers ──
  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 11) value = value.slice(0, 11)
    if (value.length > 9) value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4")
    else if (value.length > 6) value = value.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, "$1.$2.$3")
    else if (value.length > 3) value = value.replace(/^(\d{3})(\d{1,3}).*/, "$1.$2")
    setCpf(value)
  }

  async function salvarApenasPaciente() {
    if (!nomePaciente.trim()) { toast.error("Informe o nome do paciente."); return }
    if (!dataNascimento) { toast.error("Informe a data de nascimento."); return }

    setIsSavingPaciente(true)
    try {
      let currentPacienteId = pacienteId

      if (!currentPacienteId && cpf.length === 14) {
        const { data: pacienteExistente } = await supabase.from('pacientes').select('id').eq('cpf', cpf).maybeSingle()
        currentPacienteId = pacienteExistente?.id || null
      }

      if (!currentPacienteId) {
        const { data: pacientePorNome } = await supabase.from('pacientes')
          .select('id').eq('nome_completo', nomePaciente.trim()).eq('data_nascimento', dataNascimento).maybeSingle()
        currentPacienteId = pacientePorNome?.id || null
      }

      if (!currentPacienteId) {
        const { data: novoPaciente, error } = await supabase.from('pacientes')
          .insert({ nome_completo: nomePaciente.trim(), data_nascimento: dataNascimento, cpf: cpf.length === 14 ? cpf : null })
          .select('id').single()
        if (error) throw error
        setPacienteId(novoPaciente.id)
        toast.success("Paciente cadastrado com sucesso!")
      } else {
        if (cpf.length === 14) {
          await supabase.from('pacientes').update({ cpf }).eq('id', currentPacienteId).is('cpf', null)
        }
        setPacienteId(currentPacienteId)
        toast.success("Paciente já estava cadastrado e foi atualizado!")
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar paciente.")
    } finally {
      setIsSavingPaciente(false)
    }
  }

  function handleContinuarParaExames() {
    if (!nomePaciente.trim() || !dataNascimento) {
      toast.error("Preencha Nome e Nascimento antes de continuar.")
      return
    }
    setEtapa(2)
  }

  function toggleExame(exame: CatalogoExame) {
    setSelecionados(prev => {
      const exists = prev.find(e => e.nome === exame.nome)
      if (exists) return prev.filter(e => e.nome !== exame.nome)
      return [...prev, { nome: exame.nome, codigo: exame.codigo, valor: exame.valor }]
    })
  }

  function handleAdicionarExameLivre() {
    if (!novoExameLivre.trim()) return
    const nome = novoExameLivre.trim().toUpperCase()
    if (selecionados.find(e => e.nome === nome)) {
      toast.error("Este exame já foi adicionado.")
      return
    }
    setSelecionados(prev => [...prev, { nome, codigo: null, valor: 0 }])
    setNovoExameLivre("")
    toast.success("Exame livre adicionado à seleção.")
  }

  function removerExameSelecionado(nome: string) {
    setSelecionados(prev => prev.filter(e => e.nome !== nome))
  }

  function handleContinuarParaSolicitacao() {
    if (selecionados.length === 0) {
      toast.error("Selecione pelo menos um exame.")
      return
    }
    setEtapa(3)
  }

  async function handleGerar() {
    if (!medicoSolicitante.trim()) { toast.error("Selecione o médico solicitante."); return }
    if (!prestadorId) { toast.error("Selecione o laboratório executor."); return }
    if (!horarioColeta) { toast.error("Selecione o horário de coleta."); return }

    setIsSaving(true)
    try {
      // 1. Garantir que o paciente está salvo
      let currentPacienteId = pacienteId
      if (!currentPacienteId) {
        if (cpf.length === 14) {
          const { data: pacienteExistente } = await supabase.from('pacientes').select('id').eq('cpf', cpf).maybeSingle()
          currentPacienteId = pacienteExistente?.id || null
        }
        if (!currentPacienteId) {
          const { data: pacientePorNome } = await supabase.from('pacientes')
            .select('id').eq('nome_completo', nomePaciente.trim()).eq('data_nascimento', dataNascimento).maybeSingle()
          currentPacienteId = pacientePorNome?.id || null
        }
        if (!currentPacienteId) {
          const { data: novoPaciente, error } = await supabase.from('pacientes')
            .insert({ nome_completo: nomePaciente.trim(), data_nascimento: dataNascimento, cpf: cpf.length === 14 ? cpf : null })
            .select('id').single()
          if (error) throw error
          currentPacienteId = novoPaciente.id
        }
        setPacienteId(currentPacienteId)
      }

      // 2. Gerar código de barras único (timestamp + random)
      const ts = Date.now().toString().slice(-6)
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const codigo = `${ts}${rand}`
      setCodigoBarras(codigo)

      // 3. Criar solicitação
      const agora = new Date()
      const isEmergencia = horarioColeta.includes("Emergência")
      
      const { data: novaSolicitacao, error: errSolic } = await supabase
        .from('solicitacoes')
        .insert({
          codigo_barras: codigo,
          paciente_id: currentPacienteId,
          prestador_id: prestadorId,
          medico_solicitante: medicoSolicitante,
          solicitante_origem: 'Hospital',
          data_prevista: format(agora, 'yyyy-MM-dd'),
          hora_prevista: agora.toTimeString().split(' ')[0],
          horario_coleta: horarioColeta,
          classificacao: isEmergencia ? 'emergencia' : classificacao,
          status: 'solicitado',
          qtd_exames: selecionados.length,
          qtd_realizados: 0,
        })
        .select('id')
        .single()

      if (errSolic) throw errSolic

      // 4. Criar exames individuais
      const examesParaInserir = selecionados.map((ex) => ({
        solicitacao_id: novaSolicitacao.id,
        nome_exame: ex.nome,
        codigo_procedimento: ex.codigo,
        valor: ex.valor,
        realizado: false,
      }))

      const { error: errExames } = await supabase.from('exames').insert(examesParaInserir)
      if (errExames) throw errExames

      // 5. Sucesso
      setGerado(true)
      toast.success("Solicitação salva no sistema! Clique em Imprimir.")
    } catch (error: any) {
      console.error("Erro ao salvar:", error)
      toast.error(error?.message || "Erro ao salvar a solicitação.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleImprimir() {
    const win = window.open("", "_blank")
    if (!win) { toast.error("Permita popups para imprimir."); return }

    const prestadorNome = prestadores.find((p) => p.id === prestadorId)?.nome || ""
    const dataAtual = new Date().toLocaleDateString("pt-BR")
    const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const dataNasc = dataNascimento ? new Date(dataNascimento + "T12:00:00").toLocaleDateString("pt-BR") : ""

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Solicitação de Exames - ${nomePaciente}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; }
    .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 16pt; color: #1e3a5f; margin-bottom: 2px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 16px; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; }
    .info-item { display: flex; gap: 6px; }
    .info-label { font-weight: 700; font-size: 9pt; color: #555; text-transform: uppercase; min-width: 100px; }
    .info-value { font-size: 10pt; }
    .info-full { grid-column: 1 / -1; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 3px; font-size: 9pt; font-weight: 700; text-transform: uppercase; }
    .badge-int { background: #dbeafe; color: #1e40af; }
    .badge-emg { background: #fee2e2; color: #b91c1c; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
    .table th, .table td { border-bottom: 1px solid #eee; padding: 6px 4px; text-align: left; }
    .table th { border-bottom: 2px solid #ccc; font-weight: 700; color: #555; text-transform: uppercase; font-size: 9pt; }
    .table td.valor { text-align: right; }
    .table th.valor { text-align: right; }
    .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 16px; display: flex; justify-content: space-between; }
    .assinatura { text-align: center; width: 45%; }
    .assinatura .linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 9pt; }
    .total-box { text-align: right; margin-top: 15px; font-size: 12pt; font-weight: bold; color: #1e3a5f; padding: 10px; background: #f8f9fa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SOLICITAÇÃO DE EXAMES LABORATORIAIS</h1>
    <p>Prefeitura Municipal de Querência/MT — Secretaria de Saúde</p>
  </div>
  <div class="info-grid">
    <div class="info-item info-full">
      <span class="info-label">Paciente:</span>
      <span class="info-value" style="font-weight:700; font-size:12pt;">${nomePaciente.toUpperCase()}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Nascimento:</span><span class="info-value">${dataNasc}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Horário Coleta:</span><span class="info-value" style="font-weight:bold; color:#b91c1c;">${horarioColeta}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Médico:</span><span class="info-value">${medicoSolicitante}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Laboratório:</span><span class="info-value" style="font-weight:600;">${prestadorNome}</span>
    </div>
    <div class="info-item info-full">
      <span class="info-label">Código Barras:</span><span class="info-value font-mono">${codigoBarras}</span>
    </div>
  </div>

  <h2 style="font-size:12pt; color:#1e3a5f; margin-top:20px;">Exames Solicitados (${selecionados.length})</h2>
  <table class="table">
    <thead>
      <tr>
        <th width="20%">CÓDIGO</th>
        <th width="60%">EXAME</th>
        <th width="20%" class="valor">VALOR (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${selecionados.map(ex => `
        <tr>
          <td>${ex.codigo || '—'}</td>
          <td>${ex.nome}</td>
          <td class="valor">${ex.valor > 0 ? ex.valor.toFixed(2).replace('.', ',') : '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="total-box">
    VALOR TOTAL: R$ ${valorTotalSelecionados.toFixed(2).replace('.', ',')}
  </div>

  <div class="footer">
    <div class="assinatura"><div class="linha">Médico Solicitante</div></div>
    <div class="assinatura"><div class="linha">Recebido pelo Laboratório</div></div>
  </div>
  <div style="text-align: right; font-size: 8pt; color: #999; margin-top: 12px;">Gerado pelo Sistema Lab Querência em ${dataAtual} às ${horaAtual}</div>
</body>
</html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* ── Progress Bar ── */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full z-0"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-500" style={{ width: etapa === 1 ? '0%' : etapa === 2 ? '50%' : '100%' }}></div>
        
        {[1, 2, 3].map((step) => (
          <div key={step} className={`relative z-10 flex flex-col items-center justify-center w-10 h-10 rounded-full font-bold transition-colors ${etapa >= step ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            {step === 1 && <User className="w-5 h-5" />}
            {step === 2 && <Stethoscope className="w-5 h-5" />}
            {step === 3 && <FileText className="w-5 h-5" />}
            <span className="absolute -bottom-6 text-xs whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
              {step === 1 ? 'Paciente' : step === 2 ? 'Exames' : 'Solicitação'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border p-6 sm:p-8 mt-10">
        
        {/* ── ETAPA 1: PACIENTE ── */}
        {etapa === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground mb-4">Dados do Paciente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cpf" className="text-slate-600 dark:text-muted-foreground">CPF do Paciente (opcional)</Label>
                <Input id="cpf" placeholder="000.000.000-00" value={cpf} onChange={handleCpfChange} className="dark:bg-slate-900 max-w-sm" />
                {isLoadingHistorico ? (
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Verificando histórico...</p>
                ) : historicoCount > 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Paciente já possui {historicoCount} solicitação(ões) no sistema.</p>
                ) : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nome-paciente" className="text-slate-600 dark:text-muted-foreground">Nome Completo *</Label>
                <Input id="nome-paciente" placeholder="Ex: João Carlos Santos" value={nomePaciente} onChange={(e) => setNomePaciente(e.target.value)} className="dark:bg-slate-900" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="data-nascimento" className="text-slate-600 dark:text-muted-foreground">Data de Nascimento *</Label>
                <Input id="data-nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className="dark:bg-slate-900" />
                {idadeCalculada !== null && <p className="text-xs text-slate-500 mt-1">Idade: {idadeCalculada} anos</p>}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-border mt-8">
              <Button type="button" variant="outline" onClick={salvarApenasPaciente} disabled={isSavingPaciente} className="gap-2 w-full sm:w-auto">
                {isSavingPaciente ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                Apenas Salvar Paciente
              </Button>
              <Button type="button" onClick={handleContinuarParaExames} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full sm:w-auto">
                Continuar para Exames <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: EXAMES ── */}
        {etapa === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 dark:text-foreground">Seleção de Exames</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
                {selecionados.length} selecionado(s) - R$ {valorTotalSelecionados.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Buscar no catálogo..." value={buscaExame} onChange={(e) => setBuscaExame(e.target.value)} className="pl-10 dark:bg-slate-900" />
              </div>
              <div className="flex gap-2 flex-1">
                <Input placeholder="Adicionar exame livre..." value={novoExameLivre} onChange={(e) => setNovoExameLivre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdicionarExameLivre()} className="dark:bg-slate-900" />
                <Button type="button" variant="secondary" onClick={handleAdicionarExameLivre}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 max-h-[50vh] overflow-y-auto border border-slate-200 dark:border-border">
              {isLoadingCatalogo ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-6">
                  {/* Exames Destaque */}
                  {examesDestaque.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-3 border-b border-amber-200 dark:border-amber-900/50 pb-1">Destaques (Marcadores Cardíacos)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {examesDestaque.map(ex => {
                          const isSelected = !!selecionados.find(s => s.nome === ex.nome)
                          return (
                            <label key={ex.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${isSelected ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700' : 'bg-white border-slate-200 dark:bg-card dark:border-border hover:border-amber-300'}`}>
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleExame(ex)} />
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${isSelected ? 'text-amber-900 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>{ex.nome}</p>
                                <p className="text-xs text-slate-500">Cod: {ex.codigo || '--'} | R$ {ex.valor.toFixed(2)}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Catálogo Geral */}
                  {examesNormais.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-3 border-b border-blue-200 dark:border-blue-900/50 pb-1">Catálogo Geral</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {examesNormais.map(ex => {
                          const isSelected = !!selecionados.find(s => s.nome === ex.nome)
                          return (
                            <label key={ex.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${isSelected ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700' : 'bg-white border-slate-200 dark:bg-card dark:border-border hover:border-blue-300'}`}>
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleExame(ex)} />
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${isSelected ? 'text-blue-900 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'} truncate`} title={ex.nome}>{ex.nome}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Exames Livres Adicionados */}
                  {selecionados.filter(s => !catalogo.find(c => c.nome === s.nome)).length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-3 border-b border-emerald-200 dark:border-emerald-900/50 pb-1">Exames Adicionados Manualmente</h3>
                      <div className="flex flex-wrap gap-2">
                        {selecionados.filter(s => !catalogo.find(c => c.nome === s.nome)).map(ex => (
                          <div key={ex.nome} className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                            {ex.nome}
                            <button type="button" onClick={() => removerExameSelecionado(ex.nome)} className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-200 ml-1">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-border mt-8">
              <Button type="button" variant="outline" onClick={() => setEtapa(1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button type="button" onClick={handleContinuarParaSolicitacao} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                Continuar <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: SOLICITAÇÃO ── */}
        {etapa === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground mb-4">Detalhes Finais da Solicitação</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-border">
              
              <div className="space-y-1.5 relative sm:col-span-2">
                <Label className="text-slate-600 dark:text-muted-foreground">Médico Solicitante *</Label>
                <Input
                  placeholder="Buscar por nome ou CRM..."
                  value={buscaMedico}
                  onChange={(e) => {
                    setBuscaMedico(e.target.value)
                    setShowMedicoDropdown(true)
                    if (!e.target.value.trim()) setMedicoSolicitante("")
                  }}
                  onFocus={() => setShowMedicoDropdown(true)}
                  className="dark:bg-slate-950"
                />
                {medicoSolicitante && !showMedicoDropdown && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">✓ {medicoSolicitante}</p>
                )}
                {showMedicoDropdown && buscaMedico.trim().length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {medicos.filter((m) => m.nome.toLowerCase().includes(buscaMedico.toLowerCase()) || m.crm.toLowerCase().includes(buscaMedico.toLowerCase())).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setMedicoSolicitante(`Dr(a). ${m.nome} (CRM: ${m.crm})`)
                            setBuscaMedico(m.nome)
                            setShowMedicoDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-800 text-sm transition-colors flex flex-col"
                        >
                          <span className="font-medium text-slate-800 dark:text-foreground">Dr(a). {m.nome}</span>
                          <span className="text-xs text-slate-500 dark:text-muted-foreground">CRM: {m.crm}{m.especialidade ? ` • ${m.especialidade}` : ""}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-600 dark:text-muted-foreground">Laboratório Executor *</Label>
                <select value={prestadorId} onChange={(e) => setPrestadorId(e.target.value)} className="flex h-9 w-full rounded-lg border border-input dark:border-border dark:bg-slate-950 dark:text-foreground bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Selecione o laboratório...</option>
                  {prestadores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-600 dark:text-muted-foreground">Classificação Base</Label>
                <select value={classificacao} onChange={(e) => setClassificacao(e.target.value as "internamento" | "emergencia")} className="flex h-9 w-full rounded-lg border border-input dark:border-border dark:bg-slate-950 dark:text-foreground bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="internamento">🏥 Internamento</option>
                  <option value="emergencia">🚨 Emergência</option>
                </select>
              </div>

              <div className="space-y-3 sm:col-span-2 mt-2">
                <Label className="text-slate-600 dark:text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4"/> Horário de Coleta *</Label>
                <div className="flex flex-wrap gap-2">
                  {HORARIOS_COLETA.map(horario => {
                    const isEmergencia = horario.includes("Emergência")
                    const isSelected = horarioColeta === horario
                    return (
                      <button
                        key={horario}
                        type="button"
                        onClick={() => setHorarioColeta(horario)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all
                          ${isSelected 
                            ? isEmergencia ? 'bg-red-600 text-white border-red-700 shadow-md' : 'bg-blue-600 text-white border-blue-700 shadow-md'
                            : isEmergencia ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:border-red-900 dark:text-red-400' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-card dark:border-border dark:text-slate-300 dark:hover:bg-slate-800'
                          }
                        `}
                      >
                        {horario}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-border mt-8">
              <Button type="button" variant="outline" onClick={() => setEtapa(2)} disabled={isSaving || gerado} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button type="button" onClick={handleGerar} disabled={isSaving || gerado} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-lg shadow-emerald-200 dark:shadow-none gap-2 text-base h-11">
                {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : gerado ? <><Check className="w-5 h-5" /> Salvo! Imprimir Agora</> : <><FileText className="w-5 h-5" /> Gerar Solicitação</>}
              </Button>
            </div>

            {gerado && (
              <div className="mt-4 flex justify-end animate-in fade-in zoom-in duration-300">
                <Button type="button" onClick={handleImprimir} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 h-11">
                  <Printer className="w-5 h-5" /> Imprimir Relatório
                </Button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
