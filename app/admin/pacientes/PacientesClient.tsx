"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { calcularIdade } from "@/lib/calcularIdade"
import {
  Loader2, Plus, Search, UserPlus, Users, Edit, X, Check,
  ToggleLeft, ToggleRight, FlaskConical, Calendar, CreditCard
} from "lucide-react"
import Link from "next/link"

interface Paciente {
  id: string
  nome_completo: string
  data_nascimento: string
  cpf: string | null
  created_at: string
}

interface Props {
  pacientesIniciais: Paciente[]
}

export function PacientesClient({ pacientesIniciais }: Props) {
  const [pacientes, setPacientes] = useState<Paciente[]>(pacientesIniciais)
  const [busca, setBusca] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Form fields
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [cpf, setCpf] = useState("")

  const supabase = createClient()

  // Filtrar pacientes pela busca
  const pacientesFiltrados = pacientes.filter((p) => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    return (
      p.nome_completo.toLowerCase().includes(termo) ||
      (p.cpf && p.cpf.includes(termo))
    )
  })

  function handleCpfChange(value: string) {
    let v = value.replace(/\D/g, "")
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4")
    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, "$1.$2.$3")
    else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3}).*/, "$1.$2")
    setCpf(v)
  }

  function handleEditClick(paciente: Paciente) {
    setEditingId(paciente.id)
    setNome(paciente.nome_completo)
    setDataNascimento(paciente.data_nascimento)
    setCpf(paciente.cpf || "")
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setNome("")
    setDataNascimento("")
    setCpf("")
  }

  async function handleCadastrarOuEditar(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) { toast.error("Informe o nome do paciente."); return }
    if (!dataNascimento) { toast.error("Informe a data de nascimento."); return }

    setIsSaving(true)

    try {
      if (editingId) {
        // Edit mode
        const { data, error } = await supabase
          .from("pacientes")
          .update({
            nome_completo: nome.trim(),
            data_nascimento: dataNascimento,
            cpf: cpf.length === 14 ? cpf : null,
          })
          .eq('id', editingId)
          .select()
          .single()

        if (error) {
          if (error.code === "23505") toast.error("Já existe um paciente com este CPF.")
          else throw error
          return
        }

        setPacientes(prev => prev.map(p => p.id === editingId ? data : p).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)))
        toast.success(`Paciente ${data.nome_completo} atualizado!`)
        handleCancelEdit()
      } else {
        // Create mode — check duplicates first
        if (cpf.length === 14) {
          const { data: existente } = await supabase.from('pacientes').select('id').eq('cpf', cpf).maybeSingle()
          if (existente) {
            toast.error("Já existe um paciente com este CPF.")
            setIsSaving(false)
            return
          }
        }

        const { data, error } = await supabase
          .from("pacientes")
          .insert({
            nome_completo: nome.trim(),
            data_nascimento: dataNascimento,
            cpf: cpf.length === 14 ? cpf : null,
          })
          .select()
          .single()

        if (error) {
          if (error.code === "23505") toast.error("Já existe um paciente com este CPF.")
          else throw error
          return
        }

        setPacientes(prev => [...prev, data].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)))
        setNome("")
        setDataNascimento("")
        setCpf("")
        toast.success(`Paciente ${data.nome_completo} cadastrado com sucesso!`)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || "Erro ao salvar paciente.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário de Cadastro / Edição */}
      <div className={`bg-white dark:bg-card rounded-2xl shadow-sm border p-6 transition-colors ${editingId ? 'border-amber-300 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-950/20' : 'border-slate-200 dark:border-border'}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {editingId ? <Edit className="w-5 h-5 text-amber-600" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
            <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-muted-foreground">
              {editingId ? "Editar Paciente" : "Cadastrar Novo Paciente"}
            </h2>
          </div>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-slate-500 hover:text-red-600">
              <X className="w-4 h-4 mr-1" /> Cancelar Edição
            </Button>
          )}
        </div>

        <form onSubmit={handleCadastrarOuEditar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-slate-600 dark:text-muted-foreground">Nome Completo *</Label>
            <Input placeholder="Ex: João Carlos Santos" value={nome} onChange={(e) => setNome(e.target.value)} className="dark:bg-slate-900" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-muted-foreground">Data de Nascimento *</Label>
            <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className="dark:bg-slate-900" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-muted-foreground">CPF (opcional)</Label>
            <Input placeholder="000.000.000-00" value={cpf} onChange={(e) => handleCpfChange(e.target.value)} className="dark:bg-slate-900" />
          </div>
          <div className="md:col-span-4 flex justify-end gap-3 mt-2">
            <Button type="submit" disabled={isSaving} className={editingId ? "bg-amber-600 hover:bg-amber-700 text-white gap-2 px-6" : "bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6"}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? "Salvar Alterações" : "Cadastrar Paciente"}
            </Button>
          </div>
        </form>
      </div>

      {/* Lista de Pacientes */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-muted-foreground">Pacientes ({pacientes.length})</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar por nome ou CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8 h-9 text-sm dark:bg-slate-900" />
          </div>
        </div>

        {pacientesFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-muted-foreground">
            {pacientes.length === 0 ? "Nenhum paciente cadastrado ainda. Cadastre o primeiro acima." : `Nenhum paciente encontrado para "${busca}".`}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-border max-h-[60vh] overflow-y-auto">
            {pacientesFiltrados.map((paciente) => {
              const idade = calcularIdade(paciente.data_nascimento)
              const dataNasc = new Date(paciente.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")

              return (
                <div key={paciente.id} className={`p-4 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors ${editingId === paciente.id ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-800 dark:text-foreground">{paciente.nome_completo}</span>
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {dataNasc} · {idade} anos
                      </span>
                      {paciente.cpf && (
                        <>
                          <span className="text-slate-300 dark:text-border">•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <CreditCard className="w-3.5 h-3.5" />
                            {paciente.cpf}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/nova-solicitacao?paciente_id=${paciente.id}`}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900 transition-colors"
                    >
                      <FlaskConical className="w-4 h-4" />
                      <span className="hidden sm:inline">Solicitar Exame</span>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(paciente)} className="h-8 gap-1.5 text-slate-600 hover:text-amber-600">
                      <Edit className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
