"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { Loader2, Plus, Search, FilePlus, Edit, X, ToggleLeft, ToggleRight, Star, Check } from "lucide-react"

interface CatalogoExame {
  id: string
  nome: string
  codigo: string | null
  valor: number
  destaque: boolean
  ativo: boolean
  created_at: string
}

interface Props {
  examesIniciais: CatalogoExame[]
}

export function ExamesClient({ examesIniciais }: Props) {
  const [exames, setExames] = useState<CatalogoExame[]>(examesIniciais)
  const [busca, setBusca] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Form fields
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [codigo, setCodigo] = useState("")
  const [valor, setValor] = useState("")
  const [destaque, setDestaque] = useState(false)

  const supabase = createClient()

  // Filtrar pela busca
  const examesFiltrados = exames.filter((m) => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    return (
      m.nome.toLowerCase().includes(termo) ||
      (m.codigo && m.codigo.toLowerCase().includes(termo))
    )
  })

  function handleEditClick(exame: CatalogoExame) {
    setEditingId(exame.id)
    setNome(exame.nome)
    setCodigo(exame.codigo || "")
    setValor(exame.valor.toString())
    setDestaque(exame.destaque)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setNome("")
    setCodigo("")
    setValor("")
    setDestaque(false)
  }

  async function handleCadastrarOuEditar(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) { toast.error("Informe o nome do exame."); return }

    const valorNumerico = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNumerico)) {
      toast.error("Informe um valor válido.")
      return
    }

    setIsSaving(true)

    try {
      if (editingId) {
        // Edit mode
        const { data, error } = await supabase
          .from("catalogo_exames")
          .update({
            nome: nome.trim().toUpperCase(),
            codigo: codigo.trim() || null,
            valor: valorNumerico,
            destaque,
          })
          .eq('id', editingId)
          .select()
          .single()

        if (error) throw error

        setExames(prev => prev.map(m => m.id === editingId ? data : m).sort((a, b) => {
          if (a.destaque !== b.destaque) return a.destaque ? -1 : 1
          return a.nome.localeCompare(b.nome)
        }))
        toast.success(`Exame atualizado com sucesso!`)
        handleCancelEdit()
      } else {
        // Create mode
        const { data, error } = await supabase
          .from("catalogo_exames")
          .insert({
            nome: nome.trim().toUpperCase(),
            codigo: codigo.trim() || null,
            valor: valorNumerico,
            destaque,
          })
          .select()
          .single()

        if (error) throw error

        setExames(prev => [...prev, data].sort((a, b) => {
          if (a.destaque !== b.destaque) return a.destaque ? -1 : 1
          return a.nome.localeCompare(b.nome)
        }))
        setNome("")
        setCodigo("")
        setValor("")
        setDestaque(false)
        toast.success(`Exame cadastrado com sucesso!`)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || "Erro ao salvar exame.")
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleAtivo(exame: CatalogoExame) {
    const novoStatus = !exame.ativo
    setExames((prev) => prev.map((m) => (m.id === exame.id ? { ...m, ativo: novoStatus } : m)))

    try {
      const { error } = await supabase.from("catalogo_exames").update({ ativo: novoStatus }).eq("id", exame.id)
      if (error) throw error
      toast.success(novoStatus ? `Exame reativado.` : `Exame desativado.`)
    } catch (error: any) {
      setExames((prev) => prev.map((m) => (m.id === exame.id ? { ...m, ativo: !novoStatus } : m)))
      toast.error("Erro ao alterar status.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário de Cadastro / Edição */}
      <div className={`bg-white dark:bg-card rounded-2xl shadow-sm border p-6 transition-colors ${editingId ? 'border-amber-300 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-950/20' : 'border-slate-200 dark:border-border'}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {editingId ? <Edit className="w-5 h-5 text-amber-600" /> : <FilePlus className="w-5 h-5 text-blue-600" />}
            <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-muted-foreground">
              {editingId ? "Editar Exame" : "Cadastrar Novo Exame"}
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
            <Label className="text-slate-600 dark:text-muted-foreground">Nome do Exame *</Label>
            <Input placeholder="Ex: HEMOGRAMA COMPLETO" value={nome} onChange={(e) => setNome(e.target.value)} className="dark:bg-slate-900" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-muted-foreground">Código TUSS (opcional)</Label>
            <Input placeholder="Ex: 02.02.02.038-0" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="dark:bg-slate-900" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-muted-foreground">Valor (R$) *</Label>
            <Input placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} className="dark:bg-slate-900" />
          </div>
          
          <div className="md:col-span-4 flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={destaque} onCheckedChange={(c) => setDestaque(c === true)} />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Destacar (aparece no topo da lista)</span>
            </label>

            <Button type="submit" disabled={isSaving} className={editingId ? "bg-amber-600 hover:bg-amber-700 text-white gap-2 px-6" : "bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6"}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? "Salvar Alterações" : "Cadastrar Exame"}
            </Button>
          </div>
        </form>
      </div>

      {/* Lista de Exames */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-border overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-muted-foreground">Catálogo ({exames.length})</h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar exame..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8 h-9 text-sm dark:bg-slate-900" />
          </div>
        </div>

        {examesFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-muted-foreground">
            {exames.length === 0 ? "Nenhum exame cadastrado ainda." : `Nenhum exame encontrado para "${busca}".`}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-border max-h-[60vh] overflow-y-auto">
            {examesFiltrados.map((exame) => (
              <div key={exame.id} className={`p-4 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors ${!exame.ativo ? "opacity-50" : ""} ${editingId === exame.id ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-foreground">{exame.nome}</span>
                    {exame.destaque && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    {!exame.ativo && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Inativo</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-muted-foreground">
                    <span className="font-mono font-medium">Cod: {exame.codigo || '--'}</span>
                    <span className="text-slate-300 dark:text-border">•</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-500">R$ {exame.valor.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(exame)} className="h-8 gap-1.5 text-slate-600 hover:text-amber-600">
                    <Edit className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleAtivo(exame)} className={exame.ativo ? "text-green-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 gap-1.5" : "text-red-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 gap-1.5"}>
                    {exame.ativo ? <><ToggleRight className="w-5 h-5" /><span className="hidden sm:inline">Ativo</span></> : <><ToggleLeft className="w-5 h-5" /><span className="hidden sm:inline">Inativo</span></>}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
