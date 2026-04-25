"use client"

import { useState, useRef, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Printer, Search, FileText, User, Stethoscope, Check } from "lucide-react"

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

interface Props {
  prestadores: { id: string; nome: string }[]
}

export function NovaSolicitacaoForm({ prestadores }: Props) {
  // ── Patient data ──
  const [nomePaciente, setNomePaciente] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [classificacao, setClassificacao] = useState<"internamento" | "emergencia">("internamento")
  const [medicoSolicitante, setMedicoSolicitante] = useState("")
  const [prestadorId, setPrestadorId] = useState("")

  // ── Selected exams ──
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState("")

  // ── Print ref ──
  const printRef = useRef<HTMLDivElement>(null)

  // ── Generated flag ──
  const [gerado, setGerado] = useState(false)

  // ── Filtered exams ──
  const categoriasFiltradas = useMemo(() => {
    if (!busca.trim()) return CATEGORIAS_EXAMES
    const termo = busca.toLowerCase()
    return CATEGORIAS_EXAMES.map((cat) => ({
      ...cat,
      exames: cat.exames.filter((e) => e.toLowerCase().includes(termo)),
    })).filter((cat) => cat.exames.length > 0)
  }, [busca])

  // ── Handlers ──
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

  function handleGerar() {
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
    setGerado(true)
    toast.success("Solicitação gerada! Clique em Imprimir para gerar o documento.")
    setTimeout(() => {
      document.getElementById("area-impressao")?.scrollIntoView({ behavior: "smooth" })
    }, 200)
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
      {/* ── Dados do Paciente ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500">Dados do Paciente</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="nome-paciente" className="text-slate-600">Nome Completo do Paciente *</Label>
            <Input
              id="nome-paciente"
              placeholder="Ex: João Carlos Santos"
              value={nomePaciente}
              onChange={(e) => setNomePaciente(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="data-nascimento" className="text-slate-600">Data de Nascimento *</Label>
            <Input
              id="data-nascimento"
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600">Classificação *</Label>
            <select
              value={classificacao}
              onChange={(e) => setClassificacao(e.target.value as "internamento" | "emergencia")}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="internamento">🏥 Internamento</option>
              <option value="emergencia">🚨 Emergência</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medico" className="text-slate-600">Médico Solicitante</Label>
            <Input
              id="medico"
              placeholder="Ex: Dr. Alceu"
              value={medicoSolicitante}
              onChange={(e) => setMedicoSolicitante(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600">Laboratório Executor *</Label>
            <select
              value={prestadorId}
              onChange={(e) => setPrestadorId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 text-base shadow-lg shadow-blue-200"
        >
          <FileText className="w-5 h-5" />
          Gerar Solicitação
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
    </div>
  )
}
