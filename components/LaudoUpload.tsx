"use client"
import { useState, useRef } from "react"
import { FileUp, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"

interface LaudoUploadProps {
  solicitacaoId: string
  onUploadSuccess: () => void
}

export function LaudoUpload({ solicitacaoId, onUploadSuccess }: LaudoUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.type !== "application/pdf") {
        toast.error("Formato inválido. Apenas arquivos PDF são permitidos.")
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    
    try {
      const filePath = `${solicitacaoId}/laudo.pdf`
      
      // Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('laudos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('laudos')
        .getPublicUrl(filePath)

      // Atualizar a solicitação para liberado
      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({
          status: 'liberado',
          laudo_url: publicUrl,
          laudo_uploaded_at: new Date().toISOString()
        })
        .eq('id', solicitacaoId)

      if (updateError) throw updateError

      toast.success("Laudo enviado e solicitação liberada com sucesso!")
      setIsOpen(false)
      onUploadSuccess()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Erro ao fazer upload do laudo.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg lg:text-xl font-bold shadow-lg mt-4 flex items-center justify-center gap-2">
          <FileUp className="w-6 h-6" />
          Liberar com Laudo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-800">Anexar Laudo</DialogTitle>
          <DialogDescription className="text-slate-500">
            Faça upload do laudo em PDF para alterar o status para liberado.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              selectedFile ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 bg-slate-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {selectedFile ? (
              <>
                <FileText className="w-12 h-12 text-primary mb-4" />
                <p className="font-medium text-slate-800 max-w-[200px] truncate">{selectedFile.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <FileUp className="w-12 h-12 text-slate-400 mb-4" />
                <p className="font-medium text-slate-700">Clique para selecionar um arquivo PDF</p>
                <p className="text-sm text-slate-500 mt-1">ou arraste e solte o arquivo aqui</p>
              </>
            )}
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
            className="w-full h-12 text-lg font-bold bg-primary"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> 
                Enviando...
              </span>
            ) : (
              "Confirmar e Liberar Exame"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
