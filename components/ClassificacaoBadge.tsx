import { Badge } from "@/components/ui/badge"

interface ClassificacaoBadgeProps {
  classificacao: 'internamento' | 'emergencia'
}

export function ClassificacaoBadge({ classificacao }: ClassificacaoBadgeProps) {
  if (classificacao === 'emergencia') {
    return (
      <Badge className="bg-red-500 hover:bg-red-600 text-white shadow-sm border-0 font-medium">
        Emergência
      </Badge>
    )
  }
  
  return (
    <Badge className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm border-0 font-medium">
      Internamento
    </Badge>
  )
}
