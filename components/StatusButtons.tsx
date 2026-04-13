"use client"
import { Button } from "@/components/ui/button"

export type StatusExame = 'solicitado' | 'coletado' | 'liberado'

interface StatusButtonsProps {
  currentStatus: StatusExame
  onChangeStatus?: (newStatus: StatusExame) => void
  disabled?: boolean
  className?: string
}

export function StatusButtons({ currentStatus, onChangeStatus, disabled, className = "mt-4" }: StatusButtonsProps) {
  const getButtonStyle = (statusToMatch: StatusExame, activeStyle: string) => {
    return currentStatus === statusToMatch 
      ? `${activeStyle} shadow-md scale-105 transition-all duration-200 z-10 font-bold border-transparent`
      : "bg-background text-muted-foreground border-border hover:bg-muted font-normal shadow-none scale-100 opacity-70"
  }

  return (
    <div className={`flex w-full gap-2 items-center rounded-lg bg-muted/30 p-1.5 border ${className}`}>
      <Button 
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onChangeStatus && onChangeStatus('solicitado')}
        className={`flex-1 ${getButtonStyle('solicitado', 'bg-slate-500 text-white hover:bg-slate-600')} rounded-md`}
      >
        <span className="truncate">Solicitado</span>
      </Button>
      <Button 
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onChangeStatus && onChangeStatus('coletado')}
        className={`flex-1 ${getButtonStyle('coletado', 'bg-amber-500 text-white hover:bg-amber-600')} rounded-md`}
      >
        <span className="truncate">Coletado</span>
      </Button>
      <Button 
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onChangeStatus && onChangeStatus('liberado')}
        className={`flex-1 ${getButtonStyle('liberado', 'bg-green-500 text-white hover:bg-green-600')} rounded-md`}
      >
        <span className="truncate">Liberado</span>
      </Button>
    </div>
  )
}
