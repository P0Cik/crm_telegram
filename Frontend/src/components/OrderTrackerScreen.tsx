import React from 'react';
import { ArrowLeft, Landmark, Truck, Key, CheckCircle, ChevronRight, FileText, UserCheck, MessageSquare } from 'lucide-react';
import { Order, Checkpoint } from '../types';

interface OrderTrackerScreenProps {
  order: Order;
  onBack: () => void;
  onViewCheckpointPhoto: (checkpoint: Checkpoint) => void;
  onOpenTelegramChat?: () => void;
}

export default function OrderTrackerScreen({
  order,
  onBack,
  onViewCheckpointPhoto,
  onOpenTelegramChat
}: OrderTrackerScreenProps) {
  // Map internal status strings to active progress stages indexes:
  // 0 -> dealing (сделка), 1 -> korea_warehouse (склад корея), 2 -> shipping (в пути), 3 -> delivered (получен)
  const statusToStep: Record<string, number> = {
    'dealing': 0,
    'korea_warehouse': 1,
    'shipping': 2,
    'delivered': 3
  };

  const currentStep = statusToStep[order.status] ?? 0;

  const STEPS = [
    { label: 'Оформлен', icon: FileText, desc: 'Договор закл.' },
    { label: 'Склад Корея', icon: Landmark, desc: 'Инспекция ЛКП' },
    { label: 'В пути', icon: Truck, desc: 'Морской фрахт' },
    { label: 'Доставлен', icon: Key, desc: 'Вручение ключей' }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header back navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-850 font-sans">Заказ №{order.id}</h1>
            <p className="text-[10px] text-slate-400 font-mono">Ожидается {order.expectedDeliveryDate}</p>
          </div>
        </div>

        <span className="bg-sky-55 w-2 h-2 rounded-full animate-ping text-sky-600 block shrink-0"></span>
      </div>

      {/* Modern Horizontal Steps Progress Tracker */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <h4 className="text-[11px] text-slate-400 uppercase font-mono font-bold tracking-wider break-words">Этапы доставки из Кореи</h4>
        
        <div className="relative flex justify-between items-center px-1">
          {/* Progress background line */}
          <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-slate-100 z-0" />
          
          {/* Colored progress overlay line */}
          <div 
            className="absolute top-5 left-[10%] h-0.5 bg-sky-500 transition-all duration-300 z-0" 
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 80}%` }}
          />

          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            
            return (
              <div key={idx} className="flex flex-col items-center space-y-1.5 flex-1 select-none min-w-0 z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-sky-500 text-white outline outline-4 outline-white' 
                    : isActive 
                    ? 'bg-sky-50 text-sky-600 outline outline-4 outline-white border-2 border-sky-500' 
                    : 'bg-white text-slate-400 border-2 border-slate-200 outline outline-4 outline-white'
                }`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5 text-white" /> : <Icon className="w-4 h-4" />}
                </div>

                <div className="text-center font-sans w-full px-0.5">
                  <p className={`text-[9px] sm:text-[10px] font-bold leading-tight break-words ${isActive ? 'text-sky-600' : isCompleted ? 'text-slate-800' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-[7px] sm:text-[8px] text-slate-400 leading-tight break-words mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chronological inspection logs checkpoints timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Фото-отчеты и вехи</h3>
          <span className="text-[10px] text-slate-400 bg-stone-100 px-2 py-0.5 rounded font-mono">
            {order.checkpoints.length} записей
          </span>
        </div>

        <div className="relative border-l-2 border-slate-100 pl-4.5 ml-2.5 space-y-6">
          {order.checkpoints.map((cp) => (
            <div key={cp.id} className="relative group">
              {/* Timeline dot node */}
              <span className="absolute -left-[25px] top-1.5 w-3 h-3 rounded-full bg-sky-500 outline outline-4 outline-white"></span>
              
              <div className="space-y-2 font-sans bg-white border border-slate-150 p-3.5 rounded-xl shadow-sm hover:shadow hover:border-slate-300 transition duration-150">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {cp.statusText}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded shrink-0">
                    {cp.date}
                  </span>
                </div>

                {/* Inspect thumbnail and trigger details action */}
                {cp.imageUrl && (
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <img 
                        src={cp.imageUrl} 
                        alt="" 
                        className="w-12 h-9 rounded object-cover border border-slate-200" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-[10px] text-slate-400 font-sans">
                        <p className="font-semibold line-clamp-1">Эксперт: {cp.inspectorName}</p>
                        <p className="font-mono">{cp.inspectionTime}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onViewCheckpointPhoto(cp)}
                      type="button"
                      className="shrink-0 text-[10px] font-bold text-sky-500 hover:text-sky-600 bg-sky-50/50 hover:bg-sky-50 py-1.5 px-3 rounded-lg flex items-center gap-0.5 transition"
                    >
                      <span>Смотреть</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support chat prompt widget */}
      <div className="bg-[#eef2f7] p-4 rounded-xl border border-dashed border-slate-200 space-y-3.5">
        <div className="flex items-start gap-2 text-xs text-slate-600 leading-normal">
          <UserCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p>
            Возникли вопросы по растаможке или фрахту? Наши логисты готовы проконсультировать в Telegram 24/7.
          </p>
        </div>

        <button
          onClick={onOpenTelegramChat}
          className="w-full bg-[#2481cc] hover:bg-[#2074b8] text-white py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Запросить звонок менеджера</span>
        </button>
      </div>
    </div>
  );
}
