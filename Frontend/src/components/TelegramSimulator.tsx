import React, { useState, useEffect } from 'react';
import { 
  Send, Phone, Menu, MessageSquare, AlertCircle, ArrowLeft, 
  ExternalLink, CheckCircle2, ShoppingBag, Bell, Info 
} from 'lucide-react';
import { Car, Order, Subscription } from '../types';

interface TelegramSimulatorProps {
  onOpenMiniApp: (params?: { targetView?: string; targetId?: string }) => void;
  activeOrder?: Order | null;
  activeSubscription?: Subscription | null;
  onCloseSimulator: () => void;
  orders: Order[];
}

export default function TelegramSimulator({
  onOpenMiniApp,
  activeOrder,
  activeSubscription,
  onCloseSimulator,
  orders
}: TelegramSimulatorProps) {
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'bot';
    text: string;
    time: string;
    image?: string;
    carDetails?: Car;
    buttons?: Array<{ label: string; action: () => void; primary?: boolean }>;
  }>>([]);

  const [input, setInput] = useState('');

  // Initial welcome flow
  useEffect(() => {
    const welcomeMessages = [
      {
        id: 'welcome-1',
        sender: 'bot' as const,
        text: 'Приветствую! Добро пожаловать в бот Cars_retale! 🚗✨\n\nМы помогаем находить, выкупать и доставлять автомобили из Южной Кореи напрямую в Россию.',
        time: '09:41',
        buttons: [
          {
            label: '🚀 Открыть веб-приложение',
            action: () => onOpenMiniApp({ targetView: 'home' }),
            primary: true,
          },
          {
            label: '📞 Связаться с менеджером',
            action: () => addSystemMessage('Напишите менеджеру: @cars_korea_manager'),
          }
        ]
      }
    ];
    setMessages(welcomeMessages);
  }, []);

  // Listen to new order notifications
  useEffect(() => {
    if (activeOrder) {
      const orderId = activeOrder.id;
      // Add order confirmation message to chat
      const hasMessage = messages.some(m => m.text.includes(orderId));
      if (!hasMessage) {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: `order-notify-${Date.now()}`,
              sender: 'bot',
              text: `🤝 Ваш заказ под номером ${orderId} оформлен!\n\nАвтомобиль: ${activeOrder.carDetails.make} ${activeOrder.carDetails.model} (${activeOrder.carDetails.year})\nЦена (воны): ${activeOrder.carDetails.priceWon.toLocaleString()} ₩\nЦена (рубли): ${activeOrder.carDetails.priceRub.toLocaleString()} ₽\n\nМенеджер уже готовит документы. Вы можете отслеживать этапы доставки и фото-отчеты в реальном времени.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              image: activeOrder.carDetails.images[0],
              buttons: [
                {
                  label: '🔎 Отслеживать заказ в приложении',
                  action: () => onOpenMiniApp({ targetView: 'order-tracking', targetId: activeOrder.id }),
                  primary: true
                }
              ]
            }
          ]);
        }, 1000);
      }
    }
  }, [activeOrder]);

  const addSystemMessage = (text: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'bot',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: userMsg,
        time: currentTime
      }
    ]);

    setInput('');

    // Command processing simulation
    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      if (lower.includes('start') || lower.includes('старт')) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-start-${Date.now()}`,
            sender: 'bot',
            text: 'Welcome to Cars_retale! 📣\n\nThe world is changing every second, and we are here to make sure you dont miss a thing.\n\nИспользуйте меню ниже для запуска Mini App.',
            time: currentTime,
            buttons: [
              {
                label: 'Открыть приложение',
                action: () => onOpenMiniApp({ targetView: 'home' }),
                primary: true
              }
            ]
          }
        ]);
      } else if (lower.includes('заказ') || lower.includes('orders')) {
        if (orders.length > 0) {
          const mainOrder = orders[0];
          setMessages(prev => [
            ...prev,
            {
              id: `bot-orders-${Date.now()}`,
              sender: 'bot',
              text: `📦 Найден активный заказ №${mainOrder.id}!\nТекущий статус: В пути.\nОжидаемая дата прибытия: ${mainOrder.expectedDeliveryDate}`,
              time: currentTime,
              buttons: [
                {
                  label: 'Смотреть статус',
                  action: () => onOpenMiniApp({ targetView: 'order-tracking', targetId: mainOrder.id }),
                  primary: true
                }
              ]
            }
          ]);
        } else {
          addSystemMessage('У вас пока нет активных заказов. Откройте приложение, чтобы заказать автомобиль!');
        }
      } else {
        addSystemMessage('Команда не распознана. Для открытия интерфейса воспользуйтесь кнопкой "Открыть приложение" или отправьте /start.');
      }
    }, 1000);
  };

  // Helper mock alert trigger for CRM demo
  const triggerMockSearchAlert = () => {
    const mockCar: Car = {
      id: 'bmw-1s-alert-mock',
      make: 'BMW',
      model: '1-series',
      year: 2017,
      priceWon: 23500000,
      priceRub: 1190000,
      images: ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800'],
      country: 'Корея',
      dateAdded: '2026-06-02',
      engineVolume: 1.5,
      fuelType: 'бензин',
      gearbox: 'робот',
      wheelPosition: 'правый',
      driveType: 'передний',
      color: 'темно-серый',
      mileage: 4999,
      power: 136,
      vin: 'WBA1A11000HJ38291'
    };

    setMessages(prev => [
      ...prev,
      {
        id: `alert-${Date.now()}`,
        sender: 'bot',
        text: `🔔 Выставили новое предложение по вашему запросу: *BMW 1-Series*\n\nДата обновления: 04.05.2025\nГод: 2017\nПробег: 4999 км\nОбъем двигателя: 1.5 л\n\nЦена(won): 23 500 000\nЦена(руб): 1 190 000`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: mockCar.images[0],
        buttons: [
          {
            label: 'Посмотреть в приложении',
            action: () => onOpenMiniApp({ targetView: 'car-details', targetId: 'bmw-1s-2017-1' }),
            primary: true
          },
          {
            label: 'Оформить заказ',
            action: () => onOpenMiniApp({ targetView: 'car-details', targetId: 'bmw-1s-2017-1' }),
          }
        ]
      }
    ]);
  };

  return (
    <div className="bg-[#17212b] text-white flex flex-col rounded-2xl overflow-hidden border border-slate-700 shadow-2xl h-[580px] w-full max-w-sm mx-auto">
      {/* Bot Chat Header */}
      <div className="bg-[#24303f] px-3 py-2.5 flex items-center justify-between border-b border-[#101921]">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onCloseSimulator}
            className="md:hidden p-1 text-slate-350 hover:bg-[#2c3a4a] rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-sky-400" />
          </button>
          
          <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center font-bold text-white shadow-md relative">
            🚙
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#24303f]"></span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">cars_bot</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
            </div>
            <span className="text-[11px] text-sky-400 tracking-wide font-medium">bot</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mock Trigger button */}
          <button
            onClick={triggerMockSearchAlert}
            title="Симулировать оповещение бота"
            className="px-2 py-1 bg-sky-600 hover:bg-sky-500 active:scale-95 rounded text-[11px] font-semibold flex items-center gap-1 transition"
          >
            <Bell className="w-3 h-3 animate-pulse" /> Оповестить
          </button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0e1621] custom-scrollbar">
        <div className="flex justify-center">
          <span className="text-[10px] bg-[#1d2733] text-slate-400 px-2 py-0.5 rounded-full font-medium">
            Сегодня, 2 июня 2026
          </span>
        </div>

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-md ${
              m.sender === 'user' 
                ? 'bg-[#2b5278] text-white rounded-br-none' 
                : 'bg-[#182533] text-slate-100 rounded-bl-none'
            }`}>
              
              {m.image && (
                <div className="mb-2 rounded-lg overflow-hidden border border-[#233140]">
                  <img src={m.image} alt="Alert car" className="w-full h-36 object-cover" referrerPolicy="no-referrer" />
                </div>
              )}

              <p className="whitespace-pre-line leading-relaxed text-[13px]">{m.text}</p>
              
              <div className="text-right mt-1">
                <span className="text-[9px] text-slate-400 select-none">{m.time}</span>
              </div>
            </div>

            {/* Keyboard buttons below message */}
            {m.buttons && m.buttons.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1 w-[80%]">
                {m.buttons.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={btn.action}
                    className={`w-full text-center py-2 px-3 rounded-lg text-xs transition duration-200 font-medium active:scale-95 ${
                      btn.primary
                        ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/10'
                        : 'bg-[#1e2d3e] hover:bg-[#26374a] text-sky-400 border border-sky-900/30'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="bg-[#17212b] p-2 flex items-center gap-1.5 border-t border-[#101921]">
        <div className="p-1 px-2.5 bg-[#24303f] hover:bg-[#2a384a] rounded-full text-slate-400 text-xs font-semibold select-none cursor-pointer">
          Menu
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишите боту /start или спросите..."
          className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-200 placeholder-slate-505 px-1 py-1"
        />
        <button
          type="submit"
          className="p-1.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white transition active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Bot Description Hint */}
      <div className="bg-[#212c3a] text-[10px] py-1 text-center text-slate-400 border-t border-slate-800 flex items-center justify-center gap-1">
        <Info className="w-2.5 h-2.5 text-sky-400" />
        <span>Вы можете отправлять /start или кликать кнопки</span>
      </div>
    </div>
  );
}
