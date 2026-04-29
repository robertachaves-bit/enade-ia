import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Send, 
  Loader2, 
  CheckCircle2, 
  HelpCircle, 
  FileText, 
  ChevronRight,
  GraduationCap,
  RefreshCw,
  Library,
  Copy,
  Printer,
  Check,
  History,
  Trash2,
  BarChart3,
  Search,
  LayoutDashboard,
  Star,
  Heart,
  Download,
  Globe,
  Image as ImageIcon
} from 'lucide-react';
import { generateEnadeQuestion } from './services/geminiService';
import { EnadeQuestion, QuestionType, DifficultyLevel } from './types';
import ReactMarkdown from 'react-markdown';
import { Mermaid } from './components/Mermaid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<QuestionType>('multiple_choice');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState<EnadeQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedWord, setCopiedWord] = useState(false);
  const [history, setHistory] = useState<EnadeQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'stats' | 'favorites'>('generate');
  const [isGeneratingGraphic, setIsGeneratingGraphic] = useState(false);
  const [currentGraphic, setCurrentGraphic] = useState<{ visualData: string; explanation: string } | null>(null);

  useEffect(() => {
    // Load history
    const saved = localStorage.getItem('enade_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handleCopyWord = async () => {
    if (!question) return;
    
    // Table-based HTML for Word reliability
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
              <h1 style="color: #2563eb; margin: 0;">ENADE IA - Recurso Acadêmico</h1>
              <p style="color: #666; font-size: 11px; margin: 5px 0 0 0;">
                Tópico: ${question.topic} | Dificuldade: ${question.difficulty}/5 | Tipo: ${question.type === 'multiple_choice' ? 'Objetiva' : 'Dissertativa'}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 30px;">
              <h2 style="font-size: 14pt; color: #333; margin: 0 0 10px 0;">TEXTO BASE</h2>
              <div style="font-style: italic; color: #4b5563; line-height: 1.6; border-left: 4px solid #d1d5db; padding-left: 15px; margin-bottom: 25px;">
                ${question.context.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px;">
              <h2 style="font-size: 14pt; color: #333; margin: 0 0 10px 0;">QUESTÃO</h2>
              <p style="font-size: 16pt; font-weight: bold; margin: 0 0 20px 0;">${question.question}</p>
              
              ${question.type === 'multiple_choice' && question.options ? `
                <table width="100%" cellpadding="5" cellspacing="0" style="margin-bottom: 30px;">
                  ${question.options.map(opt => `
                    <tr>
                      <td width="40" valign="top">
                        <div style="width: 30px; height: 30px; line-height: 30px; text-align: center; border: 1px solid #ccc; border-radius: 15px; font-weight: bold;">${opt.letter}</div>
                      </td>
                      <td valign="middle" style="padding-bottom: 10px;">${opt.text}</td>
                    </tr>
                  `).join('')}
                </table>
              ` : '<div style="height: 120px; border: 2px dashed #e5e7eb; margin-bottom: 30px;"></div>'}
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #eee; padding-top: 30px;">
              <h2 style="font-size: 16pt; color: #059669; margin: 0 0 15px 0;">PARECER TÉCNICO E GABARITO</h2>
              ${question.type === 'multiple_choice' ? `
                <p style="font-size: 14pt; font-weight: bold; margin-bottom: 15px;">Gabarito Correto: <span style="color: #2563eb;">${question.correctAnswer}</span></p>
              ` : ''}
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #f3f4f6;">
                <p style="font-weight: bold; color: #374151; margin: 0 0 10px 0;">Análise Pedagógica:</p>
                <div style="color: #4b5563; line-height: 1.6;">
                  ${question.explanation.replace(/###/g, '<h4 style="margin: 15px 0 5px;">').replace(/##/g, '<h3 style="margin: 20px 0 10px;">').replace(/\n/g, '<br>')}
                </div>
              </div>
              
              ${question.evaluationCriteria ? `
                <div style="margin-top: 25px;">
                  <p style="font-weight: bold; color: #374151; margin: 0 0 5px 0;">Critérios de Avaliação:</p>
                  <ul style="color: #4b5563; margin-top: 5px;">
                    ${question.evaluationCriteria.map(c => `<li>${c}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding-top: 50px; text-align: center; font-size: 9px; color: #9ca3af;">
              Gerado por Roberta IA - Especialista em ENADE
            </td>
          </tr>
        </table>
      </div>
    `;

    try {
      const type = "text/html";
      const blob = new Blob([html], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      setCopiedWord(true);
      setTimeout(() => setCopiedWord(false), 3000);
    } catch (err) {
      console.error("Rich copy failed", err);
      // Fallback to text copy if rich context is blocked
      handleCopy();
    }
  };

  const handlePrint = () => {
    setShowAnswer(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleGenerateGraphic = async (topic: string) => {
    setIsGeneratingGraphic(true);
    setCurrentGraphic(null);
    try {
      const { generateGraphicForTopic } = await import('./services/geminiService');
      const graphic = await generateGraphicForTopic(topic);
      setCurrentGraphic(graphic);
    } catch (err) {
      console.error(err);
      setError("Não foi possível gerar o gráfico.");
    } finally {
      setIsGeneratingGraphic(false);
    }
  };

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('enade_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // Save history
  const saveToHistory = (q: EnadeQuestion) => {
    const newHistory = [q, ...history].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem('enade_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('enade_history');
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setQuestion(null);
    setShowAnswer(false);

    try {
      const result = await generateEnadeQuestion(topic, type, difficulty);
      setQuestion(result);
      saveToHistory(result);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!question) return;
    let text = `ENADE - Tópico: ${question.topic} (Dificuldade: ${question.difficulty}/5)\n\n`;
    text += `TEXTO BASE:\n${question.context}\n\n`;
    text += `QUESTÃO:\n${question.question}\n\n`;
    if (question.type === 'multiple_choice' && question.options) {
      question.options.forEach(opt => text += `${opt.letter}) ${opt.text}\n`);
      text += `\nGABARITO: ${question.correctAnswer}`;
    } else {
      text += `\nCRITÉRIOS DE AVALIAÇÃO:\n${question.evaluationCriteria?.join('\n')}`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleFavorite = (id: string) => {
    const newHistory = history.map(q => 
      q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
    );
    setHistory(newHistory);
    localStorage.setItem('enade_history', JSON.stringify(newHistory));
    
    // Update local question if it's the one being toggled
    if (question?.id === id) {
      setQuestion({ ...question, isFavorite: !question.isFavorite });
    }
  };

  const handleDownloadTxt = () => {
    if (!question) return;
    let text = `========================================\n`;
    text += `ENADE SIMULATOR - QUESTÃO ACADÊMICA\n`;
    text += `========================================\n\n`;
    text += `TÓPICO: ${question.topic}\n`;
    text += `DIFICULDADE: ${question.difficulty}/5\n`;
    text += `TIPO: ${question.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Dissertativa'}\n\n`;
    text += `TEXTO BASE:\n${question.context}\n\n`;
    text += `QUESTÃO:\n${question.question}\n\n`;
    
    if (question.type === 'multiple_choice' && question.options) {
      question.options.forEach(opt => {
        text += `${opt.letter}) ${opt.text}\n`;
      });
      text += `\nGABARITO: ${question.correctAnswer}\n`;
    } else {
      text += `\nCRITÉRIOS DE AVALIAÇÃO:\n${question.evaluationCriteria?.map((c, i) => `${i+1}. ${c}`).join('\n')}\n`;
    }
    
    text += `\nEXPLICAÇÃO:\n${question.explanation.replace(/#/g, '')}\n`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questao_enade_${question.topic.toLowerCase().replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const institutionalStats = useMemo(() => {
    if (history.length === 0) return { score: 0, total: 0 };
    const totalDiff = history.reduce((acc, q) => acc + q.difficulty, 0);
    const avgDiff = totalDiff / history.length;
    // Simple logic: Institution score is weighted by difficulty and balance
    return {
      score: (avgDiff * 1).toFixed(1),
      total: history.length,
      multipleChoice: history.filter(q => q.type === 'multiple_choice').length,
      discursive: history.filter(q => q.type === 'discursive').length
    };
  }, [history]);

  return (
    <div className="min-h-screen bg-canvas text-text-primary font-sans selection:bg-action/10 print:bg-white print:p-0">
      {/* Navigation Rail / Bottom Bar */}
      <nav className="fixed left-0 bottom-0 top-auto w-full h-16 bg-white border-t border-[#E5E2DD] flex flex-row items-center justify-around z-50 md:top-0 md:bottom-0 md:left-0 md:w-24 md:h-full md:border-r md:border-t-0 md:flex-col md:py-8 md:gap-10 print:hidden shadow-sm">
        <div className="hidden md:flex flex-col items-center gap-1 group cursor-default">
          <div className="w-12 h-12 rounded-ui bg-action flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm shadow-action/20">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-action">Roberta</span>
        </div>
        
        <div className="flex flex-row md:flex-col gap-6">
          <button 
            onClick={() => setActiveTab('generate')}
            className={cn(
              "w-12 h-12 rounded-ui flex items-center justify-center transition-all",
              activeTab === 'generate' ? "bg-action text-white shadow-md scale-105" : "text-text-secondary hover:text-action hover:bg-action/5"
            )}
            title="Gerar Questão"
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-12 h-12 rounded-ui flex items-center justify-center transition-all",
              activeTab === 'history' ? "bg-action text-white shadow-md scale-105" : "text-text-secondary hover:text-action hover:bg-action/5"
            )}
            title="Histórico"
          >
            <History className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('favorites')}
            className={cn(
              "w-12 h-12 rounded-ui flex items-center justify-center transition-all",
              activeTab === 'favorites' ? "bg-action text-white shadow-md scale-105" : "text-text-secondary hover:text-action hover:bg-action/5"
            )}
            title="Favoritos"
          >
            <Heart className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "w-12 h-12 rounded-ui flex items-center justify-center transition-all",
              activeTab === 'stats' ? "bg-action text-white shadow-md scale-105" : "text-text-secondary hover:text-action hover:bg-action/5"
            )}
            title="Painel de Estudos"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="pb-24 md:pb-12 md:pl-24 max-w-6xl mx-auto px-6 py-12 print:pl-0 print:py-0">
        <AnimatePresence mode="wait">
          {activeTab === 'generate' && (
            <motion.div 
              key="generate"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              {/* Header Text */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-action">Selo de Qualidade Roberta</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-8">
                  <h1 className="text-6xl font-bold tracking-tighter text-text-primary">ENADE <span className="italic text-highlight">IA</span></h1>
                  <p className="text-text-secondary font-medium text-sm md:text-base border-l-2 border-action/20 pl-6 italic max-w-2xl">
                    Gere questões ENADE de alta qualidade em segundos — Garantia de Doutora.
                  </p>
                </div>
              </div>

              {/* Configuration Section */}
              <section className="bg-white p-8 md:p-10 rounded-card shadow-sm border border-[#E5E2DD] print:hidden">
                <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                  <div className="md:col-span-12 lg:col-span-5 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Eixo Temático</label>
                    <input 
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Ex: Inteligência Artificial, Ética e Cidadania..."
                      className="w-full text-2xl font-serif italic bg-transparent border-b border-[#E5E2DD] pb-2 focus:border-action outline-none transition-colors text-text-primary placeholder:text-text-secondary/30"
                    />
                  </div>

                  <div className="md:col-span-6 lg:col-span-3 space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Nível de Dificuldade</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setDifficulty(lvl as DifficultyLevel)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                            difficulty === lvl ? "bg-action text-white shadow-md shadow-action/20" : "border border-[#E5E2DD] text-text-secondary hover:border-action hover:text-action"
                          )}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-6 lg:col-span-2 space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Formato</label>
                    <select 
                      value={type}
                      onChange={(e) => setType(e.target.value as QuestionType)}
                      className="w-full bg-[#f8f9fa] p-3 rounded-ui text-xs font-bold appearance-none cursor-pointer border border-[#E5E2DD] focus:border-action outline-none transition-all"
                    >
                      <option value="multiple_choice">Objetiva</option>
                      <option value="discursive">Discursiva</option>
                    </select>
                  </div>

                  <div className="md:col-span-12 lg:col-span-2">
                    <button 
                      type="submit"
                      disabled={isLoading || !topic.trim()}
                      className="w-full h-14 bg-action text-white rounded-ui font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-action/10"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                      Gerar
                    </button>
                  </div>
                </form>
              </section>

              {/* Result Area */}
              <AnimatePresence>
                {question && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8 print-static"
                  >
                    <div className="bg-white rounded-card border border-[#E5E2DD] overflow-hidden shadow-sm shadow-black/5 print:border-none print:shadow-none print:overflow-visible print-static print:block">
                      {/* Meta Rail */}
                      <div className="flex items-center justify-between p-6 border-b border-[#F5F2ED] print:border-action print:pb-4">
                        <div className="flex items-center gap-4">
                          <span className="px-3 py-1 bg-action text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">
                            Nível {question.difficulty}
                          </span>
                          <span className="text-xs font-bold text-text-secondary pt-1 uppercase tracking-widest">| {question.type === 'multiple_choice' ? 'Objetiva' : 'Dissertativa'}</span>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-highlight bg-highlight/5 px-2 py-0.5 rounded-md print:bg-white print:border print:border-highlight">
                            <Star className="w-3 h-3" />
                            QUALIDADE ROBERTA IA
                          </div>
                        </div>
                        <div className="flex gap-2 print:hidden">
                           <button 
                            onClick={() => handleToggleFavorite(question.id)} 
                            className="p-2 hover:bg-canvas rounded-ui transition-colors text-text-secondary hover:text-highlight"
                            title={question.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                           >
                            <Heart className={cn("w-4 h-4 transition-colors", question.isFavorite ? "fill-highlight text-highlight" : "")} />
                           </button>
                           <button 
                            onClick={handleCopyWord} 
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-ui font-bold text-[10px] uppercase tracking-widest transition-all border",
                              copiedWord ? "bg-green-500 border-green-500 text-white" : "bg-action text-white hover:brightness-110 shadow-lg shadow-action/20 border-action"
                            )}
                            title="Copiar formatado para o Word"
                           >
                            {copiedWord ? <Check className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                            {copiedWord ? 'Copiado para Word!' : 'Copiar para Word'}
                           </button>
                           <button 
                            onClick={handlePrint} 
                            className="p-2.5 bg-action/5 hover:bg-action/10 rounded-ui transition-all text-action border border-action/10 hover:border-action/30"
                            title="Imprimir / Salvar como PDF"
                           >
                            <Printer className="w-5 h-5 font-bold" />
                           </button>
                        </div>
                      </div>

                       <div id="question-to-pdf" className="p-8 md:p-12 space-y-12 print:p-0 print:pt-8 print:block">
                        {/* Texto Base */}
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-secondary">Texto Base / Contextualização</h3>
                          <div className="prose prose-zinc prose-lg max-w-none text-text-primary font-serif leading-relaxed italic border-l-2 border-highlight/20 pl-8">
                            <ReactMarkdown>{question.context}</ReactMarkdown>
                          </div>
                        </div>

                        {/* Visual Resources */}
                        {(question.visualData || question.visualDescription) && (
                          <div className="space-y-4 print:my-8">
                            <div className="flex items-center gap-2 text-text-secondary">
                              {question.visualData ? <BarChart3 className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">Recurso Visual Gerado</h3>
                            </div>
                            
                            {question.visualData ? (
                              <div className="w-full">
                                <Mermaid chart={question.visualData} />
                              </div>
                            ) : question.visualDescription ? (
                              <div className="relative rounded-card overflow-hidden border border-[#E5E2DD] bg-canvas group">
                                <img 
                                  src={`https://picsum.photos/seed/${encodeURIComponent(question.visualDescription.substring(0, 20))}/800/400?grayscale`}
                                  alt={question.imageAlt || "Ilustração técnica"}
                                  className="w-full h-auto object-cover opacity-90 transition-transform group-hover:scale-105"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-4 border-t border-[#E5E2DD] backdrop-blur-sm">
                                  <p className="text-[10px] text-text-secondary italic">
                                    <strong className="text-highlight">Prompt de IA:</strong> {question.visualDescription}
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Comand */}
                        <div className="pl-6 border-l-4 border-action py-3 bg-action/5 rounded-r-card">
                           <p className="text-2xl font-serif font-semibold leading-tight tracking-tight text-text-primary">
                            {question.question}
                           </p>
                        </div>

                        {/* Options */}
                        {question.type === 'multiple_choice' && question.options ? (
                          <div className="grid grid-cols-1 gap-4">
                            {question.options.map((opt) => (
                              <div key={opt.letter} className="flex gap-6 group cursor-default">
                                <span className={cn(
                                  "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border font-bold text-sm transition-all",
                                  showAnswer && opt.letter === question.correctAnswer ? "bg-green-500 border-green-500 text-white" : "border-[#E5E2DD] group-hover:bg-action group-hover:text-white group-hover:border-action"
                                )}>
                                  {opt.letter}
                                </span>
                                <p className={cn(
                                  "pt-2 transition-colors",
                                  showAnswer && opt.letter === question.correctAnswer ? "text-green-600 font-bold" : "text-text-primary group-hover:text-action"
                                )}>{opt.text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-64 rounded-ui border-2 border-dashed border-[#E5E2DD] flex items-center justify-center text-text-secondary/40 italic text-sm print:hidden">
                            Espaço destinado à resposta dissertativa do acadêmico
                          </div>
                        )}

                        {/* Explanation Toggle */}
                        <div className="print:block">
                          <div className="print:hidden">
                            {!showAnswer ? (
                               <button 
                                 onClick={() => setShowAnswer(true)}
                                 className="w-full py-6 rounded-ui bg-action text-white font-bold uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-lg shadow-action/10"
                               >
                                Revelar Parecer Técnico e Gabarito
                               </button>
                            ) : null}
                          </div>
                          
                          <motion.div 
                            initial={showAnswer ? { opacity: 1 } : { opacity: 0 }} 
                            animate={showAnswer ? { opacity: 1 } : { opacity: 0 }} 
                            className={cn(
                              "space-y-8 pt-12 border-t border-[#F5F2ED] print:border-action print:mt-12 print:pt-12 print:block print-static",
                              !showAnswer && "hidden print:block"
                            )}
                          >
                               <div className="flex items-center gap-3">
                                  <CheckCircle2 className="text-green-500 w-6 h-6" />
                                  <h4 className="text-lg font-bold text-text-primary">Análise Pedagógica e Gabarito</h4>
                               </div>
                               
                               <div className="flex flex-col md:flex-row gap-8">
                                  <div className="md:w-1/3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Alternativa Correta</p>
                                    <div className="text-6xl font-bold text-action">
                                      {question.type === 'multiple_choice' ? question.correctAnswer : '---'}
                                    </div>
                                  </div>
                                  <div className="md:w-2/3 bg-canvas/50 p-8 rounded-card border border-[#E5E2DD]">
                                     <p className="text-xs font-bold uppercase tracking-widest text-highlight mb-4">Comentário do Especialista</p>
                                     <div className="prose prose-sm prose-p:text-text-secondary prose-strong:text-text-primary">
                                        <ReactMarkdown>{question.explanation}</ReactMarkdown>
                                     </div>
                                  </div>
                               </div>

                               {question.evaluationCriteria && (
                                 <div className="space-y-4">
                                   <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Padrão de Resposta / Critérios</p>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {question.evaluationCriteria.map((c, i) => (
                                        <div key={i} className="p-4 bg-white border border-[#E5E2DD] rounded-ui text-sm flex gap-3">
                                          <span className="font-bold text-action opacity-30">0{i+1}</span>
                                          {c}
                                        </div>
                                      ))}
                                   </div>
                                 </div>
                               )}
                            </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Suggestions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                       {question.studySuggestions.map((s, i) => (
                         <div key={i} className="bg-white p-8 rounded-[32px] border border-[#E5E2DD] space-y-4 hover:shadow-lg transition-all">
                           <Library className="w-6 h-6 opacity-40 text-action" />
                            <h5 className="font-bold text-lg leading-tight">{s.topic}</h5>
                            <p className="text-xs text-text-secondary leading-relaxed">{s.description}</p>
                            <div className="flex flex-wrap gap-1">
                               {s.resources.map((r, ri) => (
                                 <span key={ri} className="px-2 py-0.5 bg-canvas text-[9px] font-bold text-text-secondary rounded-md">{r}</span>
                               ))}
                            </div>
                            <button
                              onClick={() => handleGenerateGraphic(s.topic)}
                              disabled={isGeneratingGraphic}
                              className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-ui bg-action/5 text-action text-xs font-bold hover:bg-action hover:text-white transition-all border border-action/20"
                            >
                              {isGeneratingGraphic ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
                              Gerar Infográfico
                            </button>
                         </div>
                       ))}
                    </div>

                    {/* Graphic Modal */}
                    <AnimatePresence>
                      {currentGraphic && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                          onClick={() => setCurrentGraphic(null)}
                        >
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="p-6 border-b border-[#F5F2ED] flex items-center justify-between bg-white">
                              <h3 className="font-bold text-xl text-text-primary">Recurso Visual do Tópico</h3>
                              <button 
                                onClick={() => setCurrentGraphic(null)}
                                className="p-2 hover:bg-canvas rounded-full transition-colors"
                              >
                                <ImageIcon className="w-5 h-5 text-text-secondary" />
                              </button>
                            </div>
                            <div className="p-8 overflow-y-auto space-y-8 flex-1">
                              {currentGraphic.visualData && (
                                <div className="w-full">
                                  <Mermaid chart={currentGraphic.visualData} />
                                </div>
                              )}
                              <div className="bg-canvas/50 p-6 rounded-ui border border-[#E5E2DD]">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-highlight mb-2">Explicação do Infográfico</h4>
                                <p className="text-sm text-text-secondary leading-relaxed italic">
                                  {currentGraphic.explanation}
                                </p>
                              </div>
                            </div>
                            <div className="p-6 border-t border-[#F5F2ED] flex flex-col md:flex-row items-center justify-end gap-4 bg-white">
                               <div className="flex gap-3 w-full md:w-auto">
                                 <button 
                                  onClick={() => window.print()} 
                                  className="flex items-center gap-2 px-6 py-3 bg-action text-white rounded-ui font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-action/20 flex-1 md:flex-none justify-center"
                                 >
                                  <Printer className="w-4 h-4" />
                                  Imprimir Recurso
                                 </button>
                               </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-serif font-bold">Arquivo de <span className="italic">Questões</span></h2>
                <button 
                  onClick={clearHistory}
                  className="flex items-center gap-2 text-xs font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Acervo
                </button>
              </div>

              {history.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.map((q) => (
                    <div 
                      key={q.id}
                      onClick={() => { setQuestion(q); setActiveTab('generate'); }}
                      className="bg-white p-6 rounded-card border border-[#E5E2DD] hover:border-action cursor-pointer transition-all space-y-4 group shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold bg-canvas px-2 py-1 rounded-ui uppercase tracking-widest text-text-secondary">Nível {q.difficulty}</span>
                        <div className="flex items-center gap-2">
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(q.id); }}
                            className="p-1 hover:bg-canvas rounded-ui"
                           >
                             <Heart className={cn("w-3 h-3", q.isFavorite ? "fill-highlight text-highlight" : "text-text-secondary/30")} />
                           </button>
                           <span className="text-[10px] text-text-secondary/40 font-mono">{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg group-hover:text-action transition-colors">{q.topic}</h3>
                      <p className="text-xs text-text-secondary line-clamp-2 italic opacity-60 font-serif">{q.question}</p>
                      <div className="flex gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-tighter text-text-secondary/40 border border-[#EEE] px-2 py-0.5 rounded-ui">
                          {q.type === 'multiple_choice' ? 'Objetiva' : 'Dissertativa'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                   <History className="w-12 h-12 text-[#CCC] mx-auto opacity-20" />
                   <p className="text-[#999] italic">Nenhuma questão no arquivo.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'favorites' && (
            <motion.div 
              key="favorites"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-serif font-bold">Questões <span className="italic">Favoritas</span></h2>
              </div>

              {history.filter(q => q.isFavorite).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.filter(q => q.isFavorite).map((q) => (
                    <div 
                      key={q.id}
                      onClick={() => { setQuestion(q); setActiveTab('generate'); }}
                      className="bg-white p-6 rounded-card border border-[#E5E2DD] hover:border-action cursor-pointer transition-all space-y-4 group shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold bg-canvas px-2 py-1 rounded-ui uppercase tracking-widest text-text-secondary">Nível {q.difficulty}</span>
                        <div className="flex items-center gap-2">
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(q.id); }}
                            className="p-1 hover:bg-canvas rounded-ui"
                           >
                             <Heart className="w-3 h-3 fill-highlight text-highlight" />
                           </button>
                           <span className="text-[10px] text-text-secondary/40 font-mono">{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg group-hover:text-action transition-colors">{q.topic}</h3>
                      <p className="text-xs text-text-secondary line-clamp-2 italic opacity-60 font-serif">{q.question}</p>
                      <div className="flex gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-tighter text-text-secondary/40 border border-[#EEE] px-2 py-0.5 rounded-ui">
                          {q.type === 'multiple_choice' ? 'Objetiva' : 'Dissertativa'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                   <Heart className="w-12 h-12 text-[#CCC] mx-auto opacity-20" />
                   <p className="text-[#999] italic">Você ainda não favoritou nenhuma questão.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-action">Ecossistema Roberta AI</p>
                </div>
                <h2 className="text-4xl font-bold text-text-primary">Painel de <span className="italic text-highlight">Planejamento Acadêmico</span></h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {/* Main Score Widget */}
                 <div className="md:col-span-2 bg-text-primary text-white p-12 rounded-card space-y-6 relative overflow-hidden shadow-xl">
                    <Star className="absolute top-[-20px] right-[-20px] w-48 h-48 text-white/5 rotate-12" />
                    <p className="text-xs font-bold uppercase tracking-[0.4em] opacity-40 text-canvas">Maturidade Pedagógica</p>
                    <div className="flex items-baseline gap-4">
                       <span className="text-9xl font-serif font-bold italic leading-none text-action">{institutionalStats.score}</span>
                       <span className="text-3xl opacity-20">/ 5.0</span>
                    </div>
                    <div className="p-6 bg-white/5 rounded-ui border border-white/10">
                      <p className="text-sm font-medium leading-relaxed italic text-canvas/80">
                        "O segredo da excelência acadêmica não está apenas na quantidade, mas no desafio cognitivo proposto."
                      </p>
                    </div>
                 </div>

                 {/* Balance Widget */}
                 <div className="bg-white p-8 rounded-card border border-[#E5E2DD] flex flex-col justify-between shadow-sm">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-highlight uppercase tracking-widest">Distribuição</p>
                      <h4 className="font-bold text-xl text-text-primary">Mix de Avaliação</h4>
                    </div>
                    <div className="space-y-6 py-6">
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                             <span>Objetivas</span>
                             <span>{institutionalStats.multipleChoice}</span>
                          </div>
                          <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                             <div className="h-full bg-action transition-all" style={{ width: `${(institutionalStats.multipleChoice / institutionalStats.total) * 100 || 0}%` }} />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                             <span>Dissertativas</span>
                             <span>{institutionalStats.discursive}</span>
                          </div>
                          <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                             <div className="h-full bg-highlight transition-all" style={{ width: `${(institutionalStats.discursive / institutionalStats.total) * 100 || 0}%` }} />
                          </div>
                       </div>
                    </div>
                    <div className="pt-4 border-t border-canvas text-center text-[9px] font-bold text-text-secondary uppercase tracking-widest">
                       Matriz INEP 2024 Compliance
                    </div>
                 </div>
              </div>

              <div className="bg-white p-10 rounded-card text-text-secondary text-lg italic leading-relaxed border border-[#E5E2DD] shadow-sm">
                 "No contexto acadêmico brasileiro, a qualidade não se resume a números, mas ao estímulo do pensamento crítico. Este painel ajuda a planejar um currículo balanceado seguindo os eixos temáticos do INEP."
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating help section */}
      <div className="fixed bottom-8 right-8 print:hidden">
        <div className="bg-white border border-[#E5E2DD] p-4 rounded-2xl shadow-lg text-xs font-medium max-w-[200px] leading-snug">
          Dica: Use questões de dificuldade 4 e 5 para simular as provas de excelência (Nota 5).
        </div>
      </div>
    </div>
  );
}
