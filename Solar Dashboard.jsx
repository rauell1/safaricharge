import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sun, 
  Cloud, 
  Factory, 
  Home, 
  Building2, 
  Battery, 
  UtilityPole,
  Wifi,
  Clock,
  Smartphone,
  Zap,
  ArrowDown,
  ArrowUp,
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  Sliders,
  Play,
  Pause,
  FastForward,
  ChevronDown,
  ChevronUp,
  MapPin,
  Table,
  FileText,
  PieChart,
  Settings,
  Calendar,
  CloudRain,
  Moon,
  Download
} from 'lucide-react';

// --- 1. UTILITIES & API ---

const callGeminiAPI = async (userPrompt, systemContext) => {
  const apiKey = ""; // Provided by environment
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const systemInstruction = `You are Roam AI, an advanced energy management assistant for Roam Electric in Nairobi, Kenya.
  
  System Status:
  - Time: ${systemContext.time}
  - Weather: ${systemContext.weather || 'Unknown'}
  - Solar: ${systemContext.solar} (Capacity: 50kW)
  - Battery: ${systemContext.battery} (Capacity: 60kWh)
  - Grid: ${systemContext.grid}
  
  Your Goal: Optimize energy usage and explain technical concepts simply.
  Rules: Reference specific numbers. Keep responses concise (under 50 words).`;

  const payload = {
    contents: [{ 
      role: "user", 
      parts: [{ text: `USER QUESTION:\n${userPrompt}` }] 
    }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Analyzing grid...";
    } catch (e) {
      if (i === 4) return "System communication error.";
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

const formatDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};

// --- 2. CABLES (Helper) ---

const RigidCable = ({ height = 40, width = 2, active = false, color = 'bg-slate-300', flowDirection = 'down', speed = 1, arrowColor = 'text-white' }) => (
  <div className={`relative ${color} transition-colors duration-500`} style={{ width: width, height: height }}>
     {active && (
       <div 
         className={`absolute left-1/2 -translate-x-1/2 z-10 ${flowDirection === 'down' ? 'animate-flow-down' : 'animate-flow-up'}`}
         style={{ animationDuration: `${Math.max(0.1, 0.8 / Math.max(0.2, Math.min(speed, 10)))}s` }}
       >
         <div className={`bg-white rounded-full p-0.5 shadow-sm ${flowDirection === 'down' ? '' : 'rotate-180'}`}>
            <ChevronDown size={8} className={arrowColor} strokeWidth={4} />
         </div>
       </div>
     )}
  </div>
);

const HorizontalCable = ({ width = '100%', height = 2, color = 'bg-slate-300' }) => (
  <div className={`relative ${color} transition-colors duration-500`} style={{ width: width, height: height }}></div>
);

// --- 3. VISUAL PRODUCT COMPONENTS ---

const SolarPanelProduct = ({ power, capacity, weather, isNight }) => (
  <div className="flex flex-col items-center z-20">
    <div className={`w-48 h-28 rounded-lg border-2 border-slate-300 shadow-xl relative overflow-hidden transform perspective-1000 rotate-x-12 group transition-all duration-500 hover:scale-105 ${isNight ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-900 to-slate-900'}`}>
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-2 gap-0.5 opacity-30 pointer-events-none">
        {[...Array(12)].map((_, i) => <div key={i} className="bg-slate-300"></div>)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>
      
      {/* Dynamic Reflection based on Weather */}
      {!isNight && (
        <div 
          className={`absolute top-0 rounded-full w-24 h-24 transition-all duration-1000 blur-xl
            ${weather === 'Sunny' ? 'bg-white/30 opacity-70' : weather === 'Rainy' ? 'bg-slate-400/20 opacity-20' : 'bg-white/10 opacity-40'}
          `}
          style={{ left: `${(power / capacity) * 80}%` }}
        ></div>
      )}
      {isNight && (
         <div className="absolute top-2 right-4 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white] animate-pulse"></div>
      )}
    </div>
    <div className="text-center mt-2 bg-white/80 px-3 py-1 rounded-full shadow-sm border border-slate-200 backdrop-blur-sm">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PV Array ({capacity}kW)</div>
      <div className="text-lg font-black text-slate-800 leading-none">{power.toFixed(1)} <span className="text-xs font-normal">kW</span></div>
    </div>
  </div>
);

const BatteryProduct = ({ level, status, power }) => (
  <div className="flex flex-col items-center z-20">
    <div className="relative w-28 h-40 bg-slate-100 rounded-xl border border-slate-300 shadow-lg flex flex-col items-center justify-center overflow-hidden group transition-all duration-500 hover:-translate-y-1">
      <div className="absolute top-3 text-[9px] font-black text-slate-300 tracking-widest">ROAM</div>
      <div className="w-3 h-24 bg-slate-200 rounded-full overflow-hidden relative border border-slate-300 shadow-inner">
         <div 
           className={`absolute bottom-0 left-0 w-full transition-all duration-500 
             ${status === 'Charging' ? 'bg-green-500 animate-pulse' : status === 'Discharging' ? 'bg-orange-500' : 'bg-green-600'}
           `} 
           style={{ height: `${level}%` }}
         ></div>
         <div className="absolute bottom-[20%] w-full h-0.5 bg-red-400 z-10"></div>
         <div className="absolute bottom-[20%] left-4 text-[7px] text-slate-400 -translate-y-2">Min</div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
    </div>
    <div className="text-center mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200 min-w-[80px] backdrop-blur-sm">
      <div className="text-[9px] font-bold text-slate-500 uppercase">Storage (60kWh)</div>
      <div className="text-sm font-black text-slate-800">{level.toFixed(1)}%</div>
      <div className={`text-[9px] font-bold ${status === 'Charging' ? 'text-green-600' : status === 'Discharging' ? 'text-orange-500' : 'text-slate-400'}`}>
        {status === 'Idle' ? 'IDLE' : `${Math.abs(power).toFixed(1)} kW`}
      </div>
    </div>
  </div>
);

const EVChargerProduct = ({ id, status, power, onToggle }) => (
  <div className="flex flex-col items-center z-20" onClick={onToggle}>
    <div className={`relative w-20 h-28 bg-slate-800 rounded-xl shadow-lg border-l-4 border-slate-600 flex flex-col items-center pt-3 group transition-all duration-500 hover:-translate-y-1 cursor-pointer ring-2 ${status === 'Disconnected' ? 'ring-transparent opacity-70' : 'ring-green-400 opacity-100'}`}>
      <div className="w-12 h-6 bg-black rounded border border-slate-600 flex items-center justify-center mb-2 overflow-hidden relative">
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-50 z-10 pointer-events-none"></div>
         {status === 'Charging' ? (
           <span className="text-green-500 text-[9px] font-mono animate-pulse z-20">{power.toFixed(1)}kW</span>
         ) : (
           <span className="text-slate-500 text-[8px] z-20">{status === 'Disconnected' ? 'OFF' : 'READY'}</span>
         )}
      </div>
      <div className="w-12 h-8 border-4 border-slate-700 rounded-b-full border-t-0"></div>
      <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${status === 'Charging' ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : status === 'Disconnected' ? 'bg-red-500' : 'bg-slate-600'}`}></div>
    </div>
    <div className="text-center mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200 backdrop-blur-sm">
      <div className="text-[8px] font-bold text-slate-500 uppercase">EV #{id} (7kW)</div>
      <button className="text-[8px] font-bold text-blue-600 hover:underline">
        {status === 'Disconnected' ? 'Connect' : 'Active'}
      </button>
    </div>
  </div>
);

const InverterProduct = ({ id, power }) => (
  <div className="flex flex-col items-center bg-white rounded-lg shadow-md border border-slate-200 w-24 p-2 z-20 transition-transform hover:scale-105">
    <div className="w-full flex justify-between items-center mb-1 border-b border-slate-100 pb-1">
       <span className="text-[8px] font-bold text-slate-400">16kW Unit #{id}</span>
       <div className={`w-1.5 h-1.5 rounded-full ${power > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
    </div>
    <div className="bg-slate-800 rounded w-full h-8 flex items-center justify-center font-mono text-orange-400 text-[10px] shadow-inner">
      {power.toFixed(1)} kW
    </div>
  </div>
);

const GridProduct = ({ power, isImporting, isExporting }) => (
  <div className="flex flex-col items-center z-20">
     <div className="w-24 h-32 flex items-center justify-center relative">
        <UtilityPole size={64} className="text-slate-700" strokeWidth={1} />
        {(isImporting || isExporting) && (
           <div className={`absolute top-0 right-0 p-1 rounded bg-white border border-slate-200 shadow-sm flex items-center gap-1 ${isImporting ? 'text-blue-600' : 'text-orange-500'}`}>
              {isImporting ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
              <span className="text-[9px] font-bold">{Math.abs(power).toFixed(1)} kW</span>
           </div>
        )}
     </div>
     <div className="text-center mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200 backdrop-blur-sm">
        <div className="text-[9px] font-bold text-slate-500 uppercase">Utility Grid</div>
        <div className="text-[9px] font-bold text-slate-800">
           {isImporting ? 'IMPORTING' : isExporting ? 'EXPORTING' : 'IDLE'}
        </div>
     </div>
  </div>
);

const HomeProduct = ({ power }) => (
  <div className="flex flex-col items-center z-20">
    <div className="w-24 h-32 flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 shadow-sm">
       <Home size={40} className="text-slate-700" strokeWidth={1.5} />
    </div>
    <div className="text-center mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200 backdrop-blur-sm">
      <div className="text-[9px] font-bold text-slate-500 uppercase">Home Load</div>
      <div className="text-sm font-black text-slate-800">{power.toFixed(1)} kW</div>
    </div>
  </div>
);

// --- 4. ADVANCED COMPONENTS ---

const RoamAIAssistant = ({ isOpen, onClose, data, timeOfDay, weather }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm monitoring your 50kW system with two EV chargers. Ask me anything about your energy usage!" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userMsg = { role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const systemContext = {
      time: `${Math.floor(timeOfDay)}:${(timeOfDay % 1 * 60).toFixed(0).padStart(2, '0')}`,
      weather: weather,
      solar: `${data.solarR.toFixed(1)} kW`,
      battery: `${data.batteryLevel.toFixed(1)}% (${data.batteryStatus})`,
      loads: `Home: ${data.homeLoad.toFixed(1)}kW, EV1: ${data.ev1Load.toFixed(1)}kW, EV2: ${data.ev2Load.toFixed(1)}kW`,
      grid: data.netGridPower
    };

    const aiResponseText = await callGeminiAPI(userMsg.text, systemContext);
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'assistant', text: aiResponseText }]);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-16 bottom-0 w-full md:w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-slide-in-right">
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-orange-400" />
          <h3 className="font-bold text-sm">Roam AI Advisor</h3>
        </div>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-white border text-slate-700'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-slate-400 text-xs ml-4">Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
        <input 
          type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Roam AI..." className="flex-1 bg-slate-100 rounded-full px-4 text-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button onClick={handleSend} disabled={!inputText.trim()} className="p-2 bg-orange-500 text-white rounded-full"><Send size={18} /></button>
      </div>
    </div>
  );
};

const EnergyReportModal = ({ isOpen, onClose, history, currentDayData, currentDate }) => {
  const [activeTab, setActiveTab] = useState('daily'); 

  // Aggregation Logic (Unconditional)
  const processedHistory = useMemo(() => {
    if (!history) return [];
    return [...history].reverse();
  }, [history]);

  const weeklySummary = useMemo(() => {
    if (!history) return [];
    const weeks = {};
    history.forEach(day => {
      const d = new Date(day.date);
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((d.getDay() + 1 + days) / 7);
      const key = `${d.getFullYear()}-W${weekNum}`;
      if (!weeks[key]) weeks[key] = { key, days: 0, solar: 0, gridImport: 0, load: 0, export: 0 };
      weeks[key].days++;
      weeks[key].solar += day.totals.solar;
      weeks[key].gridImport += day.totals.gridImport;
      weeks[key].load += day.totals.load;
      weeks[key].export += day.totals.gridExport;
    });
    return Object.values(weeks).reverse();
  }, [history]);

  const monthlySummary = useMemo(() => {
    if (!history) return [];
    const months = {};
    history.forEach(day => {
      const d = new Date(day.date);
      const key = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
      if (!months[key]) months[key] = { key, days: 0, solar: 0, gridImport: 0, load: 0, export: 0 };
      months[key].days++;
      months[key].solar += day.totals.solar;
      months[key].gridImport += day.totals.gridImport;
      months[key].load += day.totals.load;
      months[key].export += day.totals.gridExport;
    });
    return Object.values(months).reverse();
  }, [history]);

  // Export Function
  const handleExport = () => {
    if (!history.length) return;
    const headers = ['Date', 'Weather', 'Solar Yield (kWh)', 'Total Load (kWh)', 'Grid Import (kWh)', 'Grid Export (kWh)'];
    const rows = history.map(d => [
      new Date(d.date).toLocaleDateString(),
      d.weather,
      d.totals.solar.toFixed(2),
      d.totals.load.toFixed(2),
      d.totals.gridImport.toFixed(2),
      d.totals.gridExport.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Roam_Energy_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isOpen) return null; 

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-in-right">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PieChart size={20} className="text-orange-400" />
            <h2 className="font-bold text-lg">Energy Intelligence Report</h2>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleExport} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold flex items-center gap-1 transition-colors">
                <Download size={14} /> CSV
             </button>
             <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X size={20}/></button>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 border-b border-slate-200">
          {['daily', 'history', 'weekly', 'monthly'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === tab ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              {tab === 'daily' ? 'Live Log' : tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h3 className="font-bold text-slate-700 text-lg">{formatDate(currentDate)} (Live Simulation)</h3>
                <span className="text-xs text-slate-400">Data populates as simulation runs...</span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Load</th>
                      <th className="p-3 text-orange-600">Solar</th>
                      <th className="p-3 text-blue-600">Grid Used</th>
                      <th className="p-3 text-green-600">Batt Used</th>
                      <th className="p-3 text-purple-600">Export</th>
                      <th className="p-3">SoC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentDayData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 text-xs">
                        <td className="p-3 font-mono text-slate-400">{row.hour}:00</td>
                        <td className="p-3 font-bold">{row.load.toFixed(1)}</td>
                        <td className="p-3 text-orange-600">{row.solarUsed.toFixed(1)}</td>
                        <td className="p-3 text-blue-600 font-bold">{row.gridUsed.toFixed(1)}</td>
                        <td className="p-3 text-green-600">{row.batUsed.toFixed(1)}</td>
                        <td className="p-3 text-purple-600">{row.export.toFixed(1)}</td>
                        <td className="p-3">{Math.round(row.battery)}%</td>
                      </tr>
                    ))}
                    {currentDayData.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">Waiting for simulation...</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 text-lg">Past Daily Totals</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Weather</th>
                      <th className="p-3">Yield</th>
                      <th className="p-3">Load</th>
                      <th className="p-3 text-red-500">Import</th>
                      <th className="p-3 text-green-500">Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedHistory.map((day, i) => (
                      <tr key={i} className="hover:bg-slate-50 text-xs">
                        <td className="p-3 font-medium">{formatDate(new Date(day.date))}</td>
                        <td className="p-3 text-slate-500">{day.weather}</td>
                        <td className="p-3 text-orange-600 font-bold">{day.totals.solar.toFixed(1)}</td>
                        <td className="p-3 text-slate-700">{day.totals.load.toFixed(1)}</td>
                        <td className="p-3 text-red-500">{day.totals.gridImport.toFixed(1)}</td>
                        <td className="p-3 text-green-500">{day.totals.gridExport.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === 'weekly' || activeTab === 'monthly') && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 text-lg">{activeTab === 'weekly' ? 'Weekly' : 'Monthly'} Aggregation</h3>
              <div className="grid gap-4">
                {(activeTab === 'weekly' ? weeklySummary : monthlySummary).map((item, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{item.key}</div>
                      <div className="text-xs text-slate-400">{item.days} days recorded</div>
                    </div>
                    <div className="flex gap-4 text-right text-xs">
                      <div><div className="text-orange-500 font-bold">Avg Solar</div>{(item.solar / item.days).toFixed(1)}</div>
                      <div><div className="text-blue-500 font-bold">Total Load</div>{(item.load).toFixed(0)}</div>
                      <div>
                        <div className="text-slate-500 font-bold">Net Grid</div>
                        <span className={(item.gridImport - item.export) > 0 ? 'text-red-600' : 'text-green-600'}>
                          {Math.abs(item.gridImport - item.export).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 5. PANEL LAYOUTS ---

const Header = ({ onToggleAssistant, currentDate }) => (
  <div className="w-full bg-white relative z-50 shadow-sm">
    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
         <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-8 h-8 fill-orange-500">
              <path d="M50 0 L90 40 L75 40 L50 15 L25 40 L10 40 Z" />
              <path d="M10 50 L35 75 L50 90 L65 75 L90 50 L75 50 L50 75 L25 50 Z" />
            </svg>
            <div className="flex flex-col">
               <h1 className="text-2xl font-black tracking-wide text-orange-500 uppercase leading-none">ROAM</h1>
               <span className="text-[10px] font-bold tracking-[0.3em] text-slate-400">ELECTRIC</span>
            </div>
         </div>
      </div>
      <div className="flex items-center gap-6">
         <div className="hidden md:flex items-center gap-2 text-slate-500 text-xs font-medium bg-slate-100 px-3 py-1 rounded-full">
            <Calendar size={14} className="text-slate-400" /> {formatDate(currentDate)}
         </div>
         <div className="hidden md:flex items-center gap-2 text-slate-500 text-xs font-medium bg-slate-100 px-3 py-1 rounded-full">
            <MapPin size={14} className="text-orange-500" /> Nairobi, KE
         </div>
         <button onClick={onToggleAssistant} className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg border border-slate-700">
           <Sparkles size={14} className="text-orange-400" /> Roam AI
         </button>
      </div>
    </div>
    <div className="h-0.5 w-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
  </div>
);

const CentralDisplay = ({ data, timeOfDay, onTimeChange, isEv1Connected, isEv2Connected, onToggleEv1, onToggleEv2, isAutoMode, onToggleAuto, simSpeed, onSpeedChange, onOpenReport, priorityMode, onTogglePriority, weather, isNight }) => {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full p-6">
      <div className="text-center mb-6 w-full">
        <h2 className="text-2xl font-black text-slate-800 leading-tight">SIMULATION <span className="text-orange-500">CONTROLS</span></h2>
        
        <div className="mt-4 bg-white p-4 rounded-xl shadow-md border border-slate-200 w-full max-w-sm mx-auto relative overflow-hidden">
          <div className="absolute top-2 right-2 text-xs text-slate-400 font-bold flex items-center gap-1 bg-slate-50 px-2 py-1 rounded transition-colors duration-500">
             {isNight ? (
               <><Moon size={14} className="text-indigo-400" /> Night</>
             ) : (
               <>
                 {weather === 'Sunny' && <Sun size={14} className="text-orange-500" />}
                 {weather === 'Cloudy' && <Cloud size={14} className="text-slate-500" />}
                 {weather === 'Rainy' && <CloudRain size={14} className="text-blue-500" />}
                 {weather}
               </>
             )}
          </div>

          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Clock size={12}/> Time</span>
               {isAutoMode && <span className="text-[9px] bg-red-500 text-white px-1.5 rounded animate-pulse">LIVE</span>}
            </div>
            <span className="text-sm font-mono font-bold text-slate-800">{Math.floor(timeOfDay).toString().padStart(2, '0')}:{(timeOfDay % 1 * 60).toFixed(0).padStart(2, '0')}</span>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={onToggleAuto}
               className={`p-2 rounded-full transition-colors ${isAutoMode ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
             >
                {isAutoMode ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
             </button>
             <input 
                type="range" min="0" max="24" step="0.1" 
                value={timeOfDay} onChange={(e) => {
                   onTimeChange(parseFloat(e.target.value));
                   if(isAutoMode) onToggleAuto(); 
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
          </div>

          <div className="flex justify-center gap-2 mt-3 pt-2 border-t border-slate-100 flex-wrap">
             {[1, 5, 20, 100, 1000].map(speed => (
               <button 
                 key={speed}
                 onClick={() => onSpeedChange(speed)}
                 className={`text-[9px] px-2 py-1 rounded font-bold transition-all ${simSpeed === speed ? 'bg-slate-800 text-white scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
               >
                 x{speed}
               </button>
             ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 w-full max-w-sm mx-auto">
           <div className="flex justify-center gap-2">
             <button 
               onClick={onToggleEv1}
               className={`px-3 py-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${isEv1Connected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
             >
               <div className={`w-1.5 h-1.5 rounded-full ${isEv1Connected ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
               EV #1 (7kW)
             </button>
             <button 
               onClick={onToggleEv2}
               className={`px-3 py-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${isEv2Connected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
             >
               <div className={`w-1.5 h-1.5 rounded-full ${isEv2Connected ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
               EV #2 (7kW)
             </button>
           </div>
           
           <button 
             onClick={onTogglePriority}
             className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg p-2 flex items-center justify-between text-xs transition-colors"
           >
             <span className="font-bold text-slate-500 uppercase">Priority Logic:</span>
             <span className={`font-bold ${priorityMode === 'load' ? 'text-blue-600' : 'text-green-600'}`}>
               {priorityMode === 'load' ? 'Load First (Eco)' : 'Charge First (Backup)'}
             </span>
             <Settings size={14} className="text-slate-400" />
           </button>
        </div>
      </div>
      
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700 relative">
         <div className="p-6 relative z-10">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <div className="text-slate-400 text-[10px] uppercase tracking-wider">PV Generation</div>
                  <div className="text-3xl font-light text-white">{data.solarR.toFixed(1)} <span className="text-sm font-bold text-orange-500">kW</span></div>
               </div>
               <div className="text-right">
                  <div className="text-slate-400 text-[10px] uppercase tracking-wider">Active Loads</div>
                  <div className="text-3xl font-light text-white">{(data.homeLoad + data.ev1Load + data.ev2Load).toFixed(1)} <span className="text-sm font-bold text-blue-500">kW</span></div>
               </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
               <div className="flex justify-between items-center mb-2">
                 <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-2">
                   <Zap size={10} className="text-yellow-400" /> Flow Distribution
                 </div>
                 <button onClick={onOpenReport} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                   <Table size={10} /> Daily Report
                 </button>
               </div>
               <div className="space-y-2">
                 {/* Priority 1 */}
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-slate-300">1. {priorityMode === 'load' ? 'Loads (Solar)' : 'Battery Charge'}</span>
                   <span className="text-white font-bold">
                     {priorityMode === 'load' 
                       ? `${Math.min(data.solarR, data.homeLoad + data.ev1Load + data.ev2Load).toFixed(1)} kW` 
                       : (data.batteryStatus === 'Charging' ? `${Math.abs(data.batteryPower).toFixed(1)} kW` : '0.0 kW')
                     }
                   </span>
                 </div>
                 {/* Priority 2 */}
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-slate-300">2. {priorityMode === 'load' ? 'Battery Charge' : 'Loads (Solar)'}</span>
                   <span className="text-white font-bold">
                     {priorityMode === 'load'
                       ? (data.batteryStatus === 'Charging' ? `${Math.abs(data.batteryPower).toFixed(1)} kW` : '0.0 kW')
                       : `${Math.min(data.solarR, data.homeLoad + data.ev1Load + data.ev2Load).toFixed(1)} kW`
                     }
                   </span>
                 </div>
                 {/* Grid */}
                 <div className="flex justify-between items-center text-xs border-t border-slate-700 pt-1 mt-1">
                   <span className="text-slate-300">3. Grid Backup</span>
                   <span className={`${data.netGridPower < 0 ? 'text-red-400 font-bold' : data.netGridPower > 0 ? 'text-orange-400 font-bold' : 'text-slate-600'}`}>
                     {data.netGridPower < 0 ? `${Math.abs(data.netGridPower).toFixed(1)} kW (Import)` : data.netGridPower > 0 ? `${Math.abs(data.netGridPower).toFixed(1)} kW (Export)` : '0.0 kW'}
                   </span>
                 </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const ResidentialPanel = ({ data, isEv1Connected, isEv2Connected, onToggleEv1, onToggleEv2, simSpeed, weather, isNight }) => {
  const invPower = (data.solarR / 3);
  const isSolarActive = data.solarR > 0.1;
  const gridFlowDir = data.netGridPower < 0 ? 'up' : 'down';
  
  return (
    <div className="flex flex-col items-center w-full h-full p-6 bg-slate-50/50 rounded-3xl border border-slate-200 shadow-inner">
       <div className="mb-0">
          <SolarPanelProduct power={data.solarR} capacity={50.0} weather={weather} isNight={isNight} />
       </div>
       <div className="flex flex-col items-center">
          <RigidCable height={30} active={isSolarActive} color={isSolarActive ? "bg-orange-400" : "bg-slate-300"} speed={simSpeed} arrowColor="text-orange-600" />
          <HorizontalCable width={240} color={isSolarActive ? "bg-orange-400" : "bg-slate-300"} />
          <div className="flex justify-between w-[240px]">
             <RigidCable height={20} active={isSolarActive} color={isSolarActive ? "bg-orange-400" : "bg-slate-300"} speed={simSpeed} arrowColor="text-orange-600" />
             <RigidCable height={20} active={isSolarActive} color={isSolarActive ? "bg-orange-400" : "bg-slate-300"} speed={simSpeed} arrowColor="text-orange-600" />
             <RigidCable height={20} active={isSolarActive} color={isSolarActive ? "bg-orange-400" : "bg-slate-300"} speed={simSpeed} arrowColor="text-orange-600" />
          </div>
       </div>
       <div className="flex gap-8 justify-center items-start mb-0">
          <InverterProduct id="1" power={invPower} />
          <InverterProduct id="2" power={invPower} />
          <InverterProduct id="3" power={invPower} />
       </div>
       <div className="flex flex-col items-center">
          <div className="flex justify-between w-[240px]">
             <RigidCable height={30} active={isSolarActive} color={isSolarActive ? "bg-orange-400" : "bg-slate-300"} speed={simSpeed} arrowColor="text-orange-600" />
             <RigidCable height={30} active={isSolarActive} color={isSolarActive ? "bg-orange-400" : "bg-slate-300"} speed={simSpeed} arrowColor="text-orange-600" />
             <RigidCable height={30} active={isSolarActive} color={isSolarActive ? "bg-orange-400" : "bg-slate-300"} speed={simSpeed} arrowColor="text-orange-600" />
          </div>
          <div className="w-[550px] h-4 bg-slate-800 rounded-full shadow-md z-10 relative flex items-center justify-center">
             <div className="text-[8px] text-white font-mono tracking-widest">AC DISTRIBUTION BUS</div>
          </div>
          <div className="flex justify-between w-[500px]">
             <RigidCable 
               height={40} 
               active={data.netGridPower !== 0} 
               flowDirection={gridFlowDir} 
               color={data.netGridPower < 0 ? "bg-blue-400" : data.netGridPower > 0 ? "bg-orange-400" : "bg-slate-300"} 
               speed={simSpeed}
               arrowColor={data.netGridPower < 0 ? "text-blue-600" : "text-orange-600"}
             />
             <RigidCable height={40} active={data.homeLoad > 0} color="bg-slate-800" speed={simSpeed} arrowColor="text-slate-800" />
             <RigidCable height={40} active={data.ev1Load > 0} color={data.ev1Load > 0 ? "bg-slate-800" : "bg-slate-200"} speed={simSpeed} arrowColor="text-slate-800" />
             <RigidCable height={40} active={data.ev2Load > 0} color={data.ev2Load > 0 ? "bg-slate-800" : "bg-slate-200"} speed={simSpeed} arrowColor="text-slate-800" />
             <RigidCable 
               height={40} 
               active={data.batteryStatus !== 'Idle'} 
               flowDirection={data.batteryStatus === 'Charging' ? 'down' : 'up'} 
               color={data.batteryStatus === 'Charging' ? "bg-green-500" : data.batteryStatus === 'Discharging' ? "bg-orange-500" : "bg-slate-300"} 
               speed={simSpeed}
               arrowColor={data.batteryStatus === 'Charging' ? "text-green-600" : "text-orange-600"}
             />
          </div>
       </div>
       <div className="flex gap-4 justify-between w-full max-w-[600px] mt-0">
          <div className="flex-1 flex justify-center scale-90">
             <GridProduct power={data.netGridPower} isImporting={data.netGridPower < 0} isExporting={data.netGridPower > 0} />
          </div>
          <div className="flex-1 flex justify-center scale-90">
             <HomeProduct power={data.homeLoad} />
          </div>
          <div className="flex-1 flex justify-center scale-90">
             <EVChargerProduct id="1" status={data.ev1Status} power={data.ev1Load} onToggle={onToggleEv1} />
          </div>
          <div className="flex-1 flex justify-center scale-90">
             <EVChargerProduct id="2" status={data.ev2Status} power={data.ev2Load} onToggle={onToggleEv2} />
          </div>
          <div className="flex-1 flex justify-center scale-90">
             <BatteryProduct level={data.batteryLevel} status={data.batteryStatus} power={data.batteryPower} />
          </div>
       </div>
    </div>
  );
};

// --- 6. APP COMPONENT ---

export default function App() {
  const [timeOfDay, setTimeOfDay] = useState(12); 
  const [currentDate, setCurrentDate] = useState(new Date('2026-01-01T00:00:00'));
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); 
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false); 
  
  // Logic Config
  const [isEv1Connected, setIsEv1Connected] = useState(false);
  const [isEv2Connected, setIsEv2Connected] = useState(false);
  const [priorityMode, setPriorityMode] = useState('battery');
  
  // Environment (Changes daily)
  const [weather, setWeather] = useState('Sunny');
  
  // Historical Data
  const [history, setHistory] = useState([]);
  const [currentDayLog, setCurrentDayLog] = useState([]);
  const [lastLoggedHour, setLastLoggedHour] = useState(-1);
  
  // Real-time State
  const [data, setData] = useState({
    solarR: 0, homeLoad: 5, 
    ev1Load: 0, ev1Status: 'Disconnected',
    ev2Load: 0, ev2Status: 'Disconnected',
    batteryPower: 0, batteryLevel: 50, batteryStatus: 'Idle', 
    netGridPower: 0
  });

  const dailyAccumulators = useRef({ solar: 0, load: 0, gridImport: 0, gridExport: 0 });

  // --- DAY CHANGE LOGIC ---
  const handleNewDay = () => {
    const daySummary = {
      date: new Date(currentDate),
      weather: weather,
      totals: { ...dailyAccumulators.current },
      hourlyLog: [...currentDayLog]
    };
    
    setHistory(prev => [...prev, daySummary]);
    
    // Reset
    dailyAccumulators.current = { solar: 0, load: 0, gridImport: 0, gridExport: 0 };
    setCurrentDayLog([]);
    setLastLoggedHour(-1);

    // New Day
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setCurrentDate(nextDate);

    // Random Environment
    const r = Math.random();
    let newWeather = 'Sunny';
    if (r > 0.7) newWeather = 'Cloudy';
    if (r > 0.9) newWeather = 'Rainy';
    setWeather(newWeather);
  };

  // --- AUTOMATIC TIME PROGRESSION (Loop handled for high speeds) ---
  useEffect(() => {
    let interval;
    if (isAutoMode) {
      interval = setInterval(() => {
        setTimeOfDay(prev => {
          // Calculate step size based on speed
          // 1x = 0.05 hrs per tick (100ms)
          // 1000x = 50 hrs per tick? NO.
          // We limit max step to ~4 hours per tick to ensure we catch day rollovers reasonably well for visuals.
          // If speed is very high (e.g., 1000x), we just advance simulation days rapidly.
          
          let increment = 0.05 * simSpeed;
          let next = prev + increment;
          
          if (next >= 24) {
            handleNewDay();
            next = next % 24; // Keep overflow
          }
          return next;
        });
      }, 100); 
    }
    return () => clearInterval(interval);
  }, [isAutoMode, simSpeed, currentDate]); // added deps

  // --- LOGGING HOOK ---
  useEffect(() => {
    const currentHour = Math.floor(timeOfDay);
    if (currentHour > lastLoggedHour) {
      const snapshot = {
        hour: currentHour,
        load: data.homeLoad + data.ev1Load + data.ev2Load,
        solarUsed: data.solarR - (data.netGridPower > 0 ? data.netGridPower : 0),
        gridUsed: data.netGridPower < 0 ? Math.abs(data.netGridPower) : 0,
        batUsed: data.batteryStatus === 'Discharging' ? Math.abs(data.batteryPower) : 0,
        export: data.netGridPower > 0 ? data.netGridPower : 0,
        battery: data.batteryLevel
      };
      setCurrentDayLog(prev => [...prev, snapshot]);
      setLastLoggedHour(currentHour);
    }
  }, [timeOfDay, data]);

  // --- SIMULATION ENGINE ---
  useEffect(() => {
    setData(prev => {
      // 1. Solar
      const solarCap = 50.0;
      const inverterLimit = 48.0; 
      const peakHour = 12.75; 
      
      let weatherFactor = 1.0;
      if (weather === 'Cloudy') weatherFactor = 0.6;
      if (weather === 'Rainy') weatherFactor = 0.2;

      const sunIntensity = Math.max(0, Math.exp(-Math.pow(timeOfDay - peakHour, 2) / 8)); 
      const rawSolar = solarCap * sunIntensity * weatherFactor;
      const currentSolar = Math.min(rawSolar, inverterLimit); 
      const finalSolar = currentSolar < 0.1 ? 0 : currentSolar;

      // 2. Loads
      const currentEv1Load = isEv1Connected ? 7.0 : 0.0;
      const ev1Status = isEv1Connected ? 'Charging' : 'Disconnected';
      const currentEv2Load = isEv2Connected ? 7.0 : 0.0;
      const ev2Status = isEv2Connected ? 'Charging' : 'Disconnected';
      const totalEvLoad = currentEv1Load + currentEv2Load;

      const maxTotalLoad = 30.0;
      const maxHomeLoad = Math.max(0, maxTotalLoad - totalEvLoad);

      // --- APPLIANCE-LEVEL LOAD SIMULATION (Stochastic) ---
      let baseLoad = 0.8; // Fridge, WiFi, etc.
      let hvacLoad = 0;
      let cookingLoad = 0;
      let poolPump = 0;
      let entertainment = 0;

      // Pool Pump: 10am - 4pm
      if (timeOfDay >= 10 && timeOfDay < 16) poolPump = 2.0;

      // HVAC: Hot afternoon (1pm - 5pm), random cycling
      if (timeOfDay >= 13 && timeOfDay < 17 && weather === 'Sunny') {
         // Cycle on/off every hour (simulated by odd/even check for simplicity + noise)
         if (Math.floor(timeOfDay) % 2 === 0) hvacLoad = 3.5; 
      }

      // Cooking: Breakfast (6-8am) & Dinner (6-9pm)
      if ((timeOfDay >= 6 && timeOfDay < 8) || (timeOfDay >= 18 && timeOfDay < 21)) {
         cookingLoad = 2.0 + (Math.random() * 3.0); // Variable 2-5kW
      }

      // Entertainment (TV/Computers): Evening 7pm-11pm
      if (timeOfDay >= 19 && timeOfDay < 23) {
         entertainment = 1.5;
      }

      let variableHomeLoad = baseLoad + poolPump + hvacLoad + cookingLoad + entertainment;
      // Add slight noise
      variableHomeLoad += (Math.random() * 0.5);

      const currentHomeLoad = Math.max(0.5, Math.min(maxHomeLoad, variableHomeLoad));
      const totalLoad = currentHomeLoad + totalEvLoad;

      // 3. Priority Logic
      let availableSolar = finalSolar;
      let batPower = 0;
      let batStatus = 'Idle';
      const maxChargeRate = 20.0; 
      
      if (priorityMode === 'battery') {
        if (prev.batteryLevel < 100) {
           const chargeAmount = Math.min(availableSolar, maxChargeRate);
           if (chargeAmount > 0.1) {
              batPower = chargeAmount;
              batStatus = 'Charging';
              availableSolar -= chargeAmount; 
           }
        }
        const powerToLoads = Math.min(availableSolar, totalLoad);
        availableSolar -= powerToLoads;
      } else {
        const powerToLoads = Math.min(availableSolar, totalLoad);
        availableSolar -= powerToLoads;
        if (prev.batteryLevel < 100) {
           const chargeAmount = Math.min(availableSolar, maxChargeRate);
           if (chargeAmount > 0.1) {
              batPower = chargeAmount;
              batStatus = 'Charging';
              availableSolar -= chargeAmount; 
           }
        }
      }

      const solarUsedForLoad = (finalSolar - availableSolar) - (batStatus === 'Charging' ? batPower : 0);
      let loadDeficit = totalLoad - Math.max(0, solarUsedForLoad);
      
      if (loadDeficit > 0 && batStatus !== 'Charging') { 
         if (prev.batteryLevel > 20) {
            const maxDischarge = 20.0;
            const dischargeAmount = Math.min(loadDeficit, maxDischarge);
            batPower = -dischargeAmount; 
            batStatus = 'Discharging';
            loadDeficit -= dischargeAmount;
         }
      }

      let netGrid = 0;
      if (loadDeficit > 0.1) netGrid = -loadDeficit;
      else if (availableSolar > 0.1) netGrid = availableSolar;

      let newLevel = prev.batteryLevel;
      const timeStep = 0.05 * simSpeed; // hrs passed since last tick
      
      if (isAutoMode) {
         dailyAccumulators.current.solar += finalSolar * timeStep;
         dailyAccumulators.current.load += totalLoad * timeStep;
         if (netGrid < 0) dailyAccumulators.current.gridImport += Math.abs(netGrid) * timeStep;
         if (netGrid > 0) dailyAccumulators.current.gridExport += netGrid * timeStep;
      }

      if (batStatus === 'Charging') {
         const energyIn = batPower * timeStep; 
         const percentChange = (energyIn / 60) * 100;
         newLevel = Math.min(100, prev.batteryLevel + percentChange);
      }
      if (batStatus === 'Discharging') {
         const energyOut = Math.abs(batPower) * timeStep;
         const percentChange = (energyOut / 60) * 100;
         newLevel = Math.max(20, prev.batteryLevel - percentChange);
      }

      return {
         ...prev,
         solarR: finalSolar,
         homeLoad: currentHomeLoad,
         ev1Load: currentEv1Load,
         ev1Status: ev1Status,
         ev2Load: currentEv2Load,
         ev2Status: ev2Status,
         batteryPower: batPower,
         batteryStatus: batStatus,
         batteryLevel: newLevel,
         netGridPower: netGrid
      };
    });
  }, [timeOfDay, isEv1Connected, isEv2Connected, simSpeed, priorityMode, weather]); 

  const isNight = timeOfDay < 6 || timeOfDay > 19;

  return (
    <div className="min-h-screen bg-slate-200 font-sans text-slate-900 overflow-hidden flex flex-col relative">
       <style>{`
        @keyframes flow-down { 0% { top: 0; opacity: 0; } 100% { top: 100%; opacity: 0; } }
        @keyframes flow-up { 0% { top: 100%; opacity: 0; } 100% { top: 0; opacity: 0; } }
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-flow-down { animation: flow-down 0.8s linear infinite; }
        .animate-flow-up { animation: flow-up 0.8s linear infinite; }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
      `}</style>

      <Header onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)} currentDate={currentDate} />
      <RoamAIAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} data={data} timeOfDay={timeOfDay} weather={weather} />
      <EnergyReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        history={history}
        currentDayData={currentDayLog}
        currentDate={currentDate}
      />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl h-full min-h-[600px] bg-slate-100 rounded-[30px] shadow-2xl border border-white relative flex flex-col lg:flex-row overflow-hidden">
          <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
          
          <div className="hidden lg:flex flex-1 p-4 border-r border-slate-200/60 bg-slate-50/50 items-center justify-center">
            <div className="text-slate-400 font-mono text-sm text-center">
              <Building2 size={40} className="mx-auto mb-2 opacity-50"/>
              [Commercial View]
            </div>
          </div>

          <div className="flex-1 p-4 flex items-center justify-center z-10">
             <div className="absolute bg-orange-500/5 blur-3xl w-3/4 h-3/4 rounded-full -z-10"></div>
             <CentralDisplay 
               data={data} 
               timeOfDay={timeOfDay} 
               onTimeChange={setTimeOfDay}
               isEv1Connected={isEv1Connected}
               isEv2Connected={isEv2Connected}
               onToggleEv1={() => setIsEv1Connected(!isEv1Connected)}
               onToggleEv2={() => setIsEv2Connected(!isEv2Connected)}
               isAutoMode={isAutoMode}
               onToggleAuto={() => setIsAutoMode(!isAutoMode)}
               simSpeed={simSpeed}
               onSpeedChange={setSimSpeed}
               onOpenReport={() => setIsReportOpen(true)}
               priorityMode={priorityMode}
               onTogglePriority={() => setPriorityMode(prev => prev === 'battery' ? 'load' : 'battery')}
               weather={weather}
               isNight={isNight}
             />
          </div>

          <div className="flex-[2] p-4 bg-gradient-to-br from-slate-50 to-slate-100 relative">
            <ResidentialPanel 
              data={data} 
              isEv1Connected={isEv1Connected} 
              isEv2Connected={isEv2Connected}
              onToggleEv1={() => setIsEv1Connected(!isEv1Connected)}
              onToggleEv2={() => setIsEv2Connected(!isEv2Connected)}
              simSpeed={simSpeed} 
              weather={weather}
              isNight={isNight}
            />
          </div>
        </div>
      </main>
      
      <div className="fixed bottom-2 right-4 text-[9px] text-slate-400 font-mono">
        Roam Electric • Simulation Mode: {isAutoMode ? `Auto (x${simSpeed})` : 'Manual'}
      </div>
    </div>
  );
}