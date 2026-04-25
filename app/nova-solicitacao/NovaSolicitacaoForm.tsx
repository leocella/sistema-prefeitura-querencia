"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Printer, Search, FileText, User, Stethoscope, Check, Loader2, History } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { calcularIdade } from "@/lib/calcularIdade"

// ──────────────────────────────────────────────
// Lista de exames organizados por categoria
// ──────────────────────────────────────────────
const CATEGORIAS_EXAMES = [
  {
    categoria: "Hematologia",
    exames: [
      "HEMOGRAMA COMPLETO",
      "PLAQUETAS, CONTAGEM DE",
      "VELOCIDADE DE HEMOSSEDIMENTACAO (VHS)",
      "COAGULOGRAMA",
      "TEMPO DE PROTROMBINA - TAP",
      "TEMPO DE TROMBOPLASTINA PARCIAL ATIVADO - KPTT - TTPA",
      "DIMERO D - PRODUTO DE DEGRADACAO DA FIBRINA",
      "GRUPO SANGUINEO URGENTE (TIPAGEM) (ABO+RH)",
    ],
  },
  {
    categoria: "Bioquímica",
    exames: [
      "GLICOSE",
      "CREATININA",
      "UREIA",
      "SODIO",
      "POTASSIO",
      "MAGNESIO SANGUE",
      "ACIDO URICO",
      "PROTEINAS TOTAIS E FRACOES",
      "BILIRRUBINA TOTAL E FRACOES",
      "AMILASE",
      "LIPASE",
      "DESIDROGENASE LATICA - LDH",
      "FERRITINA SERICA",
    ],
  },
  {
    categoria: "Enzimas / Marcadores Cardíacos",
    exames: [
      "TRANSAMINASE OXALACETICA (AST/TGO) SERICO",
      "TRANSAMINASE PIRUVICA (ALT/TGP) SERICA",
      "GAMA GT - GAMA GLUTAMIL TRANSFERASE",
      "FOSFATASE ALCALINA",
      "TROPONINA I",
      "CPK - CREATINO FOSFOQUINASE",
      "CK-MB MASSA (CREATINO FOSFOQUINASE FRACAO MB) CKMB",
    ],
  },
  {
    categoria: "Perfil Lipídico",
    exames: [
      "COLESTEROL TOTAL",
      "COLESTEROL HDL",
      "COLESTEROL LDL e COLESTEROL NAO-HDL",
      "COLESTEROL VLDL",
      "TRIGLICERIDEOS",
    ],
  },
  {
    categoria: "Imunologia / Sorologia",
    exames: [
      "PROTEINA C REATIVA - PCR",
      "FATOR REUMATOIDE",
      "SOROLOGIA PARA SIFILIS",
      "HIV 1 e 2 - ANTIGENO E ANTICORPOS (4a GERACAO)",
      "DENGUE, PESQUISA DE ANTIGENO NS1 (teste rapido)",
      "INFLUENZA TIPO A E B TESTE RAPIDO",
      "NOVO CORONAVIRUS (Sars-Cov-2), PESQUISA DE ANTIGENO",
    ],
  },
  {
    categoria: "Hormônios",
    exames: [
      "TSH - HORMONIO TIREOESTIMULANTE (ultrassensivel)",
      "T4 LIVRE - TIROXINA LIVRE",
      "BETA HCG - QUALITATIVO",
      "BETA HCG - QUANTITATIVO",
    ],
  },
  {
    categoria: "Urinálise / Microbiologia",
    exames: [
      "PARCIAL DE URINA",
      "PROTEINURIA URINA ISOLADA - RELACAO PROTEINA CREATININA",
      "UROCULTURA",
      "BAAR, PESQUISA DE (Baciloscopia direta)",
      "BAAR, PESQUISA DE (Baciloscopia direta) 2",
      "BAAR, PESQUISA DE (Baciloscopia direta) 3",
    ],
  },
]

const TODOS_EXAMES = CATEGORIAS_EXAMES.flatMap((c) => c.exames)

interface Medico {
  id: string
  nome: string
  crm: string
  especialidade: string | null
}

interface Props {
  prestadores: { id: string; nome: string }[]
  medicos: Medico[]
}

export function NovaSolicitacaoForm({ prestadores, medicos }: Props) {
  // ── Patient data ──
  const [nomePaciente, setNomePaciente] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [cpf, setCpf] = useState("")
  const [classificacao, setClassificacao] = useState<"internamento" | "emergencia">("internamento")
  const [medicoSolicitante, setMedicoSolicitante] = useState("")
  const [prestadorId, setPrestadorId] = useState("")

  // ── History & summary ──
  const idadeCalculada = dataNascimento ? calcularIdade(dataNascimento) : null
  const [historicoCount, setHistoricoCount] = useState(0)
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)
  const [pacienteIdHistorico, setPacienteIdHistorico] = useState<string | null>(null)
  const [showHistoricoModal, setShowHistoricoModal] = useState(false)
  const [historicoExames, setHistoricoExames] = useState<any[]>([])

  // ── Medico search ──
  const [buscaMedico, setBuscaMedico] = useState("")
  const [showMedicoDropdown, setShowMedicoDropdown] = useState(false)

  // ── Selected exams ──
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState("")

  // ── Print ref ──
  const printRef = useRef<HTMLDivElement>(null)

  // ── Generated flag & saving state ──
  const [gerado, setGerado] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [codigoBarras, setCodigoBarras] = useState("")

  const supabase = createClient()

  // ── Filtered exams ──
  const categoriasFiltradas = useMemo(() => {
    if (!busca.trim()) return CATEGORIAS_EXAMES
    const termo = busca.toLowerCase()
    return CATEGORIAS_EXAMES.map((cat) => ({
      ...cat,
      exames: cat.exames.filter((e) => e.toLowerCase().includes(termo)),
    })).filter((cat) => cat.exames.length > 0)
  }, [busca])

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
            setPacienteIdHistorico(paciente.id)

            const { count } = await supabase
              .from("solicitacoes")
              .select("*", { count: "exact", head: true })
              .eq("paciente_id", paciente.id)

            setHistoricoCount(count || 0)
          } else {
            setHistoricoCount(0)
            setPacienteIdHistorico(null)
          }
        } finally {
          setIsLoadingHistorico(false)
        }
      } else {
        setHistoricoCount(0)
        setPacienteIdHistorico(null)
      }
    }
    checkHistorico()
  }, [cpf, supabase, nomePaciente, dataNascimento])

  // ── Handlers ──
  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 11) value = value.slice(0, 11)
    
    // Mask: 000.000.000-00
    if (value.length > 9) {
      value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4")
    } else if (value.length > 6) {
      value = value.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, "$1.$2.$3")
    } else if (value.length > 3) {
      value = value.replace(/^(\d{3})(\d{1,3}).*/, "$1.$2")
    }
    setCpf(value)
  }

  async function openHistorico() {
    if (!pacienteIdHistorico) return
    setShowHistoricoModal(true)
    const { data } = await supabase
      .from("solicitacoes")
      .select("id, codigo_barras, data_prevista, prestadores(nome)")
      .eq("paciente_id", pacienteIdHistorico)
      .order("data_prevista", { ascending: false })
    
    if (data) setHistoricoExames(data)
  }
  function toggleExame(exame: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(exame)) next.delete(exame)
      else next.add(exame)
      return next
    })
  }

  function selecionarCategoria(exames: string[]) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      const todosJaSelecionados = exames.every((e) => next.has(e))
      if (todosJaSelecionados) {
        exames.forEach((e) => next.delete(e))
      } else {
        exames.forEach((e) => next.add(e))
      }
      return next
    })
  }

  function limparTudo() {
    setSelecionados(new Set())
  }

  async function handleGerar() {
    if (!nomePaciente.trim()) {
      toast.error("Informe o nome do paciente.")
      return
    }
    if (!dataNascimento) {
      toast.error("Informe a data de nascimento.")
      return
    }
    if (!prestadorId) {
      toast.error("Selecione o laboratório.")
      return
    }
    if (selecionados.size === 0) {
      toast.error("Selecione pelo menos um exame.")
      return
    }

    setIsSaving(true)

    try {
      // 1. Criar ou buscar paciente
      let pacienteId = null

      if (cpf.length === 14) {
        // Tenta achar por CPF primeiro
        const { data: pacienteExistente } = await supabase
          .from('pacientes')
          .select('id')
          .eq('cpf', cpf)
          .maybeSingle()
        pacienteId = pacienteExistente?.id
      }

      if (!pacienteId) {
        // Tenta achar por nome e data de nascimento se CPF não achou ou não foi fornecido
        const { data: pacientePorNome } = await supabase
          .from('pacientes')
          .select('id')
          .eq('nome_completo', nomePaciente.trim())
          .eq('data_nascimento', dataNascimento)
          .maybeSingle()
        pacienteId = pacientePorNome?.id
      }

      if (!pacienteId) {
        const { data: novoPaciente, error: errPaciente } = await supabase
          .from('pacientes')
          .insert({ 
            nome_completo: nomePaciente.trim(), 
            data_nascimento: dataNascimento,
            cpf: cpf.length === 14 ? cpf : null
          })
          .select('id')
          .single()

        if (errPaciente) throw errPaciente
        pacienteId = novoPaciente.id
      } else if (cpf.length === 14) {
        // Se achou o paciente mas ele não tinha CPF, atualiza
        await supabase
          .from('pacientes')
          .update({ cpf })
          .eq('id', pacienteId)
          .is('cpf', null)
      }

      // 2. Gerar código de barras sequencial
      const { count } = await supabase
        .from('solicitacoes')
        .select('*', { count: 'exact', head: true })

      const seq = (count || 0) + 1
      const codigo = `${740086 + seq}-${seq}`
      setCodigoBarras(codigo)

      // 3. Criar solicitação
      const agora = new Date()
      const { data: novaSolicitacao, error: errSolic } = await supabase
        .from('solicitacoes')
        .insert({
          codigo_barras: codigo,
          paciente_id: pacienteId,
          prestador_id: prestadorId,
          medico_solicitante: medicoSolicitante || 'Não informado',
          solicitante_origem: 'Hospital',
          data_prevista: agora.toISOString().split('T')[0],
          hora_prevista: agora.toTimeString().split(' ')[0],
          classificacao,
          status: 'solicitado',
          qtd_exames: selecionados.size,
          qtd_realizados: 0,
        })
        .select('id')
        .single()

      if (errSolic) throw errSolic

      // 4. Criar exames individuais
      const examesParaInserir = Array.from(selecionados).map((nome) => ({
        solicitacao_id: novaSolicitacao.id,
        nome_exame: nome,
        realizado: false,
      }))

      const { error: errExames } = await supabase
        .from('exames')
        .insert(examesParaInserir)

      if (errExames) throw errExames

      // 5. Sucesso
      setGerado(true)
      toast.success("Solicitação salva no sistema! Clique em Imprimir para gerar o documento.")
      setTimeout(() => {
        document.getElementById("area-impressao")?.scrollIntoView({ behavior: "smooth" })
      }, 200)
    } catch (error: any) {
      console.error("Erro ao salvar solicitação:", error)
      toast.error(error?.message || "Erro ao salvar a solicitação no sistema.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleImprimir() {
    const conteudo = printRef.current
    if (!conteudo) return

    const win = window.open("", "_blank")
    if (!win) {
      toast.error("Popup bloqueado. Permita popups para imprimir.")
      return
    }

    const prestadorNome = prestadores.find((p) => p.id === prestadorId)?.nome || ""
    const dataAtual = new Date().toLocaleDateString("pt-BR")
    const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const dataNasc = dataNascimento ? new Date(dataNascimento + "T12:00:00").toLocaleDateString("pt-BR") : ""

    const examesList = Array.from(selecionados)
      .sort((a, b) => {
        const idxA = TODOS_EXAMES.indexOf(a)
        const idxB = TODOS_EXAMES.indexOf(b)
        return idxA - idxB
      })

    // Group selected exams by category for print
    const examesPorCat = CATEGORIAS_EXAMES.map((cat) => ({
      categoria: cat.categoria,
      exames: cat.exames.filter((e) => selecionados.has(e)),
    })).filter((cat) => cat.exames.length > 0)

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Solicitação de Exames - ${nomePaciente}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; }
    .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 16pt; color: #1e3a5f; margin-bottom: 2px; }
    .header p { font-size: 9pt; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 16px; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; }
    .info-item { display: flex; gap: 6px; }
    .info-label { font-weight: 700; font-size: 9pt; color: #555; text-transform: uppercase; min-width: 100px; }
    .info-value { font-size: 10pt; }
    .info-full { grid-column: 1 / -1; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 3px; font-size: 9pt; font-weight: 700; text-transform: uppercase; }
    .badge-int { background: #dbeafe; color: #1e40af; }
    .badge-emg { background: #fee2e2; color: #b91c1c; }
    .exames-section { margin-top: 12px; }
    .cat-title { font-size: 10pt; font-weight: 700; color: #1e3a5f; background: #e8edf3; padding: 4px 8px; margin: 8px 0 4px; border-left: 3px solid #1e3a5f; }
    .exames-list { columns: 2; column-gap: 20px; padding: 0 8px; }
    .exame-item { font-size: 10pt; padding: 2px 0; break-inside: avoid; display: flex; align-items: center; gap: 6px; }
    .exame-item::before { content: "☑"; color: #1e3a5f; font-size: 12pt; }
    .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 16px; display: flex; justify-content: space-between; }
    .assinatura { text-align: center; width: 45%; }
    .assinatura .linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 9pt; }
    .meta { text-align: right; font-size: 8pt; color: #999; margin-top: 12px; }
    .total { font-size: 10pt; font-weight: 700; color: #1e3a5f; margin-top: 10px; text-align: right; }
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
      <span class="info-label">Nascimento:</span>
      <span class="info-value">${dataNasc}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Classificação:</span>
      <span class="badge ${classificacao === "emergencia" ? "badge-emg" : "badge-int"}">${classificacao === "emergencia" ? "EMERGÊNCIA" : "INTERNAMENTO"}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Médico:</span>
      <span class="info-value">${medicoSolicitante || "—"}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Laboratório:</span>
      <span class="info-value" style="font-weight:600;">${prestadorNome}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Data:</span>
      <span class="info-value">${dataAtual} às ${horaAtual}</span>
    </div>
  </div>

  <div class="exames-section">
    <h2 style="font-size:12pt; color:#1e3a5f; margin-bottom:4px;">Exames Solicitados</h2>
    ${examesPorCat.map((cat) => `
      <div class="cat-title">${cat.categoria}</div>
      <div class="exames-list">
        ${cat.exames.map((e) => `<div class="exame-item">${e}</div>`).join("")}
      </div>
    `).join("")}
  </div>

  <div class="total">Total de exames: ${selecionados.size}</div>

  <div class="footer">
    <div class="assinatura">
      <div class="linha">Médico Solicitante</div>
    </div>
    <div class="assinatura">
      <div class="linha">Recebido pelo Laboratório</div>
    </div>
  </div>

  <div class="meta">Gerado pelo Sistema Lab Querência em ${dataAtual} às ${horaAtual}</div>
</body>
</html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  const prestadorNome = prestadores.find((p) => p.id === prestadorId)?.nome || ""

  return (
    <div className="space-y-6">
      {/* ── Formulário do Paciente e Resumo ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Formulário */}
        <div className="md:col-span-2 bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-muted-foreground">Formulário da Solicitação</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cpf" className="text-slate-600 dark:text-muted-foreground">CPF do Paciente</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                className="dark:bg-input/30 max-w-sm"
              />
              {isLoadingHistorico ? (
                <p className="text-xs text-slate-400 dark:text-muted-foreground mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Verificando histórico...
                </p>
              ) : historicoCount > 0 ? (
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20">
                    Paciente já atendido {historicoCount} vez(es)
                  </span>
                  <button 
                    type="button" 
                    onClick={openHistorico}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <History className="w-3 h-3" /> Ver histórico
                  </button>
                </div>
              ) : cpf.length === 14 ? (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Primeiro atendimento</p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome-paciente" className="text-slate-600 dark:text-muted-foreground">Nome Completo do Paciente *</Label>
              <Input
                id="nome-paciente"
                placeholder="Ex: João Carlos Santos"
                value={nomePaciente}
                onChange={(e) => setNomePaciente(e.target.value)}
                className="text-base dark:bg-input/30"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="data-nascimento" className="text-slate-600 dark:text-muted-foreground">Data de Nascimento *</Label>
              <Input
                id="data-nascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="dark:bg-input/30"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-slate-600 dark:text-muted-foreground">Classificação *</Label>
              <select
                value={classificacao}
                onChange={(e) => setClassificacao(e.target.value as "internamento" | "emergencia")}
                className="flex h-9 w-full rounded-lg border border-input dark:border-border dark:bg-input/30 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="internamento">🏥 Internamento</option>
                <option value="emergencia">🚨 Emergência</option>
              </select>
            </div>
          <div className="space-y-1.5 relative">
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
              className="dark:bg-input/30"
            />
            {medicoSolicitante && !showMedicoDropdown && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">✓ {medicoSolicitante}</p>
            )}
            {showMedicoDropdown && buscaMedico.trim().length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {medicos
                  .filter((m) => {
                    const termo = buscaMedico.toLowerCase()
                    return m.nome.toLowerCase().includes(termo) || m.crm.toLowerCase().includes(termo)
                  })
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const label = `Dr(a). ${m.nome} (CRM: ${m.crm})`
                        setMedicoSolicitante(label)
                        setBuscaMedico(m.nome)
                        setShowMedicoDropdown(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-muted/50 text-sm transition-colors flex flex-col"
                    >
                      <span className="font-medium text-slate-800 dark:text-foreground">Dr(a). {m.nome}</span>
                      <span className="text-xs text-slate-500 dark:text-muted-foreground">
                        CRM: {m.crm}{m.especialidade ? ` • ${m.especialidade}` : ""}
                      </span>
                    </button>
                  ))}
                {medicos.filter((m) => {
                  const termo = buscaMedico.toLowerCase()
                  return m.nome.toLowerCase().includes(termo) || m.crm.toLowerCase().includes(termo)
                }).length === 0 && (
                  <div className="px-3 py-3 text-sm text-slate-400 dark:text-muted-foreground text-center">
                    Nenhum médico encontrado. Cadastre em Gestão de Médicos.
                  </div>
                )}
              </div>
            )}
          </div>
            <div className="space-y-1.5">
              <Label className="text-slate-600 dark:text-muted-foreground">Laboratório Executor *</Label>
              <select
                value={prestadorId}
                onChange={(e) => setPrestadorId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input dark:border-border dark:bg-input/30 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione o laboratório...</option>
                {prestadores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lado Direito: Resumo do Paciente */}
        <div className="md:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-700 p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <User className="w-24 h-24 text-blue-600" />
          </div>
          <h3 className="text-sm uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400 mb-6">Resumo do Paciente</h3>
          
          <div className="space-y-5 flex-1 relative z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome Completo</p>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 line-clamp-2">
                {nomePaciente || <span className="text-slate-400 dark:text-slate-500 italic">Não informado</span>}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Idade</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                  {idadeCalculada !== null ? `${idadeCalculada} anos` : <span className="text-slate-400 dark:text-slate-500 italic">--</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nascimento</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                  {dataNascimento ? new Date(dataNascimento).toLocaleDateString('pt-BR') : <span className="text-slate-400 dark:text-slate-500 italic">--</span>}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CPF</p>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                {cpf || <span className="text-slate-400 dark:text-slate-500 italic">Não informado</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Seleção de Exames ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500">Selecionar Exames</h2>
            {selecionados.size > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selecionados.size > 0 && (
              <Button variant="ghost" size="sm" onClick={limparTudo} className="text-xs text-red-500 hover:text-red-700">
                Limpar seleção
              </Button>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar exame..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 w-56 h-9 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {categoriasFiltradas.map((cat) => {
            const todosNaCat = cat.exames.every((e) => selecionados.has(e))
            return (
              <div key={cat.categoria}>
                <button
                  type="button"
                  onClick={() => selecionarCategoria(cat.exames)}
                  className={`
                    w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold tracking-wide transition-colors
                    ${todosNaCat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }
                  `}
                >
                  {todosNaCat && <Check className="w-4 h-4" />}
                  {cat.categoria}
                  <span className="ml-auto text-xs font-normal opacity-70">
                    {cat.exames.filter((e) => selecionados.has(e)).length}/{cat.exames.length}
                  </span>
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mt-2 pl-2">
                  {cat.exames.map((exame) => {
                    const checked = selecionados.has(exame)
                    return (
                      <label
                        key={exame}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all
                          ${checked
                            ? "bg-blue-50 text-blue-800 font-medium ring-1 ring-blue-200"
                            : "hover:bg-slate-50 text-slate-700"
                          }
                        `}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleExame(exame)}
                        />
                        <span className="leading-tight">{exame}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {categoriasFiltradas.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              Nenhum exame encontrado para &ldquo;{busca}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* ── Botão Gerar ── */}
      <div className="flex justify-end gap-3">
        <Button
          size="lg"
          onClick={handleGerar}
          disabled={isSaving || gerado}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 text-base shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando...
            </>
          ) : gerado ? (
            <>
              <Check className="w-5 h-5" />
              Solicitação Salva
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Gerar e Salvar Solicitação
            </>
          )}
        </Button>
      </div>

      {/* ── Preview / Impressão ── */}
      {gerado && (
        <div id="area-impressao" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm uppercase tracking-widest font-bold text-green-600 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Solicitação Gerada
            </h2>
            <Button onClick={handleImprimir} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg shadow-green-200">
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </Button>
          </div>

          <div ref={printRef} className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
            <div className="text-center border-b-2 border-blue-900 pb-3 mb-4">
              <h3 className="text-lg font-bold text-blue-900">SOLICITAÇÃO DE EXAMES LABORATORIAIS</h3>
              <p className="text-xs text-slate-500">Prefeitura Municipal de Querência/MT — Secretaria de Saúde</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4 bg-white p-3 rounded-lg border">
              <div className="col-span-2">
                <span className="text-xs text-slate-500 font-bold uppercase">Paciente: </span>
                <span className="font-bold text-base">{nomePaciente.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Nascimento: </span>
                <span>{dataNascimento ? new Date(dataNascimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Classificação: </span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${classificacao === "emergencia" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {classificacao === "emergencia" ? "EMERGÊNCIA" : "INTERNAMENTO"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Médico: </span>
                <span>{medicoSolicitante || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Laboratório: </span>
                <span className="font-semibold">{prestadorNome}</span>
              </div>
            </div>

            <h4 className="text-sm font-bold text-blue-900 mb-2">Exames Solicitados ({selecionados.size})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
              {Array.from(selecionados)
                .sort((a, b) => TODOS_EXAMES.indexOf(a) - TODOS_EXAMES.indexOf(b))
                .map((exame) => (
                  <div key={exame} className="flex items-center gap-1.5 py-0.5">
                    <span className="text-blue-600">☑</span>
                    <span>{exame}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      {/* ── Dialog de Histórico ── */}
      <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Histórico do Paciente
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 dark:bg-muted p-3 rounded-md text-sm">
              <span className="font-semibold">{nomePaciente}</span> • {idadeCalculada} anos<br/>
              <span className="text-slate-500 dark:text-muted-foreground">CPF: {cpf}</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {historicoExames.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum exame encontrado.</p>
              ) : (
                historicoExames.map((solic) => (
                  <div key={solic.id} className="border border-slate-200 dark:border-border p-3 rounded-lg flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-foreground">
                        {new Date(solic.data_prevista).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground">{solic.prestadores?.nome}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono bg-slate-100 dark:bg-muted px-2 py-1 rounded">
                        {solic.codigo_barras}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
