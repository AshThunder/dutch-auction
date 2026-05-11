import { CheckCircle2, Loader2, Circle, XCircle, Lock, Unlock, Shield, Send, Radio } from 'lucide-react'

export type StepStatus = 'pending' | 'active' | 'completed' | 'error'

export interface EncryptionStep {
  id: string
  label: string
  description?: string
  status: StepStatus
  icon: 'lock' | 'unlock' | 'shield' | 'send' | 'radio'
}

const ICON_MAP = {
  lock: Lock,
  unlock: Unlock,
  shield: Shield,
  send: Send,
  radio: Radio,
}

export function EncryptionStepper({ steps, errorMessage }: {
  steps: EncryptionStep[]
  errorMessage?: string | null
}) {
  const activeIndex = steps.findIndex(s => s.status === 'active')
  const completedCount = steps.filter(s => s.status === 'completed').length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  return (
    <div className="bg-white border-2 border-[#1c1c1e] rounded-[16px] p-6 font-body-md">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-primary/10 text-primary p-3 rounded-full">
          <Shield size={24} className="animate-pulse" />
        </div>
        <div>
          <div className="font-headline-lg text-[18px] font-bold text-[#1c1c1e]">Encrypting Your Bid</div>
          <div className="font-label-mono text-[12px] uppercase opacity-70 text-[#1c1c1e]">
            {completedCount === steps.length
              ? 'All steps completed!'
              : `Step ${Math.max(activeIndex + 1, 1)} of ${steps.length}`}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[#1c1c1e]/10 h-2 rounded-full mb-8 overflow-hidden">
        <div
          className="bg-[#1c1c1e] h-full transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-4 relative">
        {/* Vertical connector line background */}
        <div className="absolute left-[15px] top-[20px] bottom-[20px] w-[2px] bg-[#1c1c1e]/10 z-0" />
        
        {steps.map((step) => {
          const Icon = ICON_MAP[step.icon]
          const isCompleted = step.status === 'completed'
          const isActive = step.status === 'active'
          const isError = step.status === 'error'
          const isPending = step.status === 'pending'
          
          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 relative z-10 ${isPending ? 'opacity-50' : 'opacity-100'}`}
            >
              {/* Icon circle */}
              <div className={`mt-1 bg-white rounded-full ${isActive ? 'text-primary' : isCompleted ? 'text-[#00c853]' : isError ? 'text-[#ff1744]' : 'text-[#1c1c1e]/30'}`}>
                {isCompleted ? (
                  <CheckCircle2 size={32} className="fill-[#00c853]/10" />
                ) : isActive ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : isError ? (
                  <XCircle size={32} className="fill-[#ff1744]/10" />
                ) : (
                  <Circle size={32} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1 pb-4">
                <div className={`font-bold ${isActive ? 'text-primary' : 'text-[#1c1c1e]'}`}>{step.label}</div>
                {step.description && isActive && (
                  <div className="text-[14px] mt-1 opacity-80">{step.description}</div>
                )}
              </div>

              {/* Step context icon */}
              <div className="pt-2 text-[#1c1c1e]/40">
                <Icon size={16} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mt-4 p-4 bg-error-container text-on-error-container rounded-lg flex items-start gap-2 font-body-md text-[14px]">
          <XCircle size={20} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  )
}
