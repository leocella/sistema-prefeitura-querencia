"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { Loader2, Plus, Search, UserPlus, Stethoscope, ToggleLeft, ToggleRight } from "lucide-react"

interface Medico {
  id: string
  nome: string
  crm: string
  especialidade: string | null
  ativo: boolean
  created_at: string
}

interface Props {
  medicosIniciais: Medico[]
}

export function MedicosClient({ medicosIniciais }: Props) {
  const [medicos, setMedicos] = useState<Medico[]>(medicosIniciais)
  const [busca, setBusca] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Form fields
  const [nome, setNome] = useState("")
  const [crm, setCrm] = useState("")
  const [especialidade, setEspecialidade] = useState("")

  const supabase = createClient()

  // Filtrar médicos pela busca
  const medicosFiltrados = medicos.filter((m) => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    return (
      m.nome.toLowerCase().includes(termo) ||
      m.crm.toLowerCase().includes(termo) ||
      (m.especialidade && m.especialidade.toLowerCase().includes(termo))
    )
  })

  // Cadastrar novo médico
  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) {
      toast.error("Informe o nome do médico.")
      return
    }
    if (!crm.trim()) {
      toast.error("Informe o CRM.")
      return
    }

    setIsSaving(true)

    try {
      const { data, error } = await supabase
        .from("medicos")
        .insert({
          nome: nome.trim(),
          crm: crm.trim().toUpperCase(),
          especialidade: especialidade.trim() || null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um médico com este CRM.")
        } else {
          throw error
        }
        return
      }

      setMedicos((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNome("")
      setCrm("")
      setEspecialidade("")
      toast.success(`Dr(a). ${data.nome} cadastrado(a) com sucesso!`)
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || "Erro ao cadastrar médico.")
    } finally {
      setIsSaving(false)
    }
  }

  // Ativar/Desativar médico
  async function toggleAtivo(medico: Medico) {
    const novoStatus = !medico.ativo

    // Optimistic update
    setMedicos((prev) =>
      prev.map((m) => (m.id === medico.id ? { ...m, ativo: novoStatus } : m))
    )

    try {
      const { error } = await supabase
        .from("medicos")
        .update({ ativo: novoStatus })
        .eq("id", medico.id)

      if (error) throw error
      toast.success(
        novoStatus
          ? `Dr(a). ${medico.nome} reativado(a).`
          : `Dr(a). ${medico.nome} desativado(a).`
      )
    } catch (error: any) {
      // Revert
      setMedicos((prev) =>
        prev.map((m) => (m.id === medico.id ? { ...m, ativo: !novoStatus } : m))
      )
      toast.error("Erro ao alterar status.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário de Cadastro */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-muted-foreground">
            Cadastrar Novo Médico
          </h2>
        </div>

        <form onSubmit={handleCadastrar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-slate-600 dark:text-muted-foreground">Nome Completo *</Label>
            <Input
              placeholder="Ex: Maria da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="dark:bg-input/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-muted-foreground">CRM *</Label>
            <Input
              placeholder="Ex: 12345-MT"
              value={crm}
              onChange={(e) => setCrm(e.target.value)}
              className="dark:bg-input/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-muted-foreground">Especialidade</Label>
            <Input
              placeholder="Ex: Clínico Geral"
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
              className="dark:bg-input/30"
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Cadastrar Médico
            </Button>
          </div>
        </form>
      </div>

      {/* Lista de Médicos */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-muted-foreground">
              Médicos Cadastrados ({medicos.length})
            </h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou CRM..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-9 text-sm dark:bg-input/30"
            />
          </div>
        </div>

        {medicosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-muted-foreground">
            {medicos.length === 0
              ? "Nenhum médico cadastrado ainda. Cadastre o primeiro acima."
              : `Nenhum médico encontrado para "${busca}".`}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-border">
            {medicosFiltrados.map((medico) => (
              <div
                key={medico.id}
                className={`p-4 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors ${
                  !medico.ativo ? "opacity-50" : ""
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-foreground">
                      Dr(a). {medico.nome}
                    </span>
                    {!medico.ativo && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-muted-foreground">
                    <span className="font-mono font-medium">CRM: {medico.crm}</span>
                    {medico.especialidade && (
                      <>
                        <span className="text-slate-300 dark:text-border">•</span>
                        <span>{medico.especialidade}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAtivo(medico)}
                  className={
                    medico.ativo
                      ? "text-green-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 gap-1.5"
                      : "text-red-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 gap-1.5"
                  }
                >
                  {medico.ativo ? (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      <span className="hidden sm:inline">Ativo</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      <span className="hidden sm:inline">Inativo</span>
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
