import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import { Checkpoint } from '../types';

interface CheckpointPhotoScreenProps {
  checkpoint: Checkpoint;
  onBack: () => void;
}

export default function CheckpointPhotoScreen({
  checkpoint,
  onBack
}: CheckpointPhotoScreenProps) {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const submitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackText('');
    }, 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation subheader */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95 flex items-center justify-center font-sans font-bold text-slate-850 text-xs"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <div>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Осмотр автомобиля</span>
          <h1 className="text-base font-bold text-slate-800 leading-tight">{checkpoint.statusText}</h1>
        </div>
      </div>

      {/* Main Large Inspection Frame */}
      <div className="space-y-2">
        <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md">
          <img 
            src={checkpoint.imageUrl} 
            alt={checkpoint.statusText} 
            className="w-full h-80 object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="text-[10px] text-slate-400 font-mono text-center">
          *Фотофиксация произведена сертифицированным оборудованием Cars_retale в высоком разрешении
        </p>
      </div>

      {/* Inspector credentials module */}
      <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-3 font-sans">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Официальный рапорт инспектора</h3>
        
        <div className="grid grid-cols-2 gap-3.5 divide-x divide-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-mono block">Инспектор</span>
            <span className="font-bold text-slate-800">{checkpoint.inspectorName}</span>
          </div>

          <div className="pl-3.5">
            <span className="text-slate-400 font-mono block">Дата/Время</span>
            <span className="font-bold text-slate-800 font-mono">{checkpoint.inspectionTime}</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg text-xs leading-relaxed text-slate-600 border border-slate-100">
          <p>
            <span className="font-extrabold text-slate-800 text-xs">Вердикт эксперта: </span> 
            Кузовные дефекты, критические сколы и следы кустарного ремонта отсутствуют. Состояние лакокрасочного покрытия (ЛКП) соответствует заводскому. Узлы автомобиля готовы к погрузке на транспортную платформу.
          </p>
        </div>
      </div>

      {/* Interactive feedback question block */}
      <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-sm text-slate-800">Появились вопросы по данному этапу?</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Напишите вопрос напрямую инспектору или менеджеру заказа. Мы ответим в чат за пару минут!
          </p>
        </div>

        {feedbackSent ? (
          <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2 border border-emerald-150 animate-in zoom-in-95 duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Вопрос успешно передан! Менеджер свяжется с вами в Telegram.</span>
          </div>
        ) : (
          <form onSubmit={submitFeedback} className="space-y-3">
            <textarea
              required
              rows={2}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Вижу грязь на фарах, кузов чистый? Можно подробное видео правого крыла?"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-450 focus:bg-white text-slate-800 placeholder-slate-400 transition"
            />
            
            <button
              type="submit"
              className="w-full bg-[#050b14] hover:bg-slate-850 text-white font-bold text-[11px] uppercase tracking-wider font-mono py-3 rounded-xl transition flex items-center justify-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Отправить менеджеру в Telegram</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
