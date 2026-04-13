"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Beaker } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Erro ao validar credenciais. Verifique seu e-mail e senha.")
        return
      }

      toast.success("Login efetuado com sucesso!")
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      toast.error("Ocorreu um erro inesperado tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl border-white/20 shadow-2xl z-10 rounded-2xl relative">
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
            <Beaker className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Portal do Laboratório</h1>
            <p className="text-sm text-slate-500 mt-1">Prefeitura de Querência / MT</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-medium">E-mail de Acesso</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@laboratorio.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white/50 border-slate-200 focus:border-primary focus:ring-primary/20 transition-all text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 font-medium">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-white/50 border-slate-200 focus:border-primary focus:ring-primary/20 transition-all text-base text-lg font-mono tracking-widest"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 text-lg font-medium shadow-md shadow-primary/20 hover:shadow-lg transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Entrando...
              </span>
            ) : "Entrar no Sistema"}
          </Button>
        </form>
      </Card>
      
      <div className="absolute bottom-6 w-full text-center text-sm text-slate-400 font-medium">
        SIGSS • Gestão de Saúde • © {new Date().getFullYear()} Querência
      </div>
    </div>
  )
}
