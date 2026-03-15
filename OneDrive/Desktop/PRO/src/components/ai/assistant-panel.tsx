'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles, Bot, User } from 'lucide-react';
import { useAuthStore } from '@/store';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const quickActions: Record<string, string[]> = {
    founder: ['How do I hire talent?', 'Explain milestones', 'Create an agreement', 'Raise funding tips'],
    investor: ['Analyze deal flow', 'Due diligence tips', 'Portfolio overview', 'Risk assessment'],
    talent: ['Find projects', 'Improve trust score', 'Payment process', 'Skill verification'],
};

export function AssistantPanel() {
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const sendingRef = useRef(false);

    if (!user) return null;

    const handleSend = async (overrideMsg?: string) => {
        const msg = (overrideMsg || input).trim();
        if (!msg || isLoading || sendingRef.current) return;

        sendingRef.current = true;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: msg,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: msg }),
            });

            const data = await response.json();

            setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === 'assistant' && lastMsg?.content === (data.response || data.error)) {
                    return prev;
                }
                return [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant' as const,
                    content: data.response || data.error || 'Could not generate a response.',
                }];
            });
        } catch {
            setMessages((prev) => [
                ...prev,
                { id: `error-${Date.now()}`, role: 'assistant', content: 'Something went wrong. Please try again.' },
            ]);
        } finally {
            setIsLoading(false);
            sendingRef.current = false;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestions = quickActions[user.role] || quickActions.talent;

    return (
        <>
            <style>{`
                @keyframes chatbot-pulse { 0%, 100% { box-shadow: 0 4px 20px rgba(46,139,87,0.3); } 50% { box-shadow: 0 4px 30px rgba(46,139,87,0.5), 0 0 60px rgba(46,139,87,0.15); } }
                @keyframes chatbot-slide-in { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes typing-dot { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }
            `}</style>

            {/* Floating Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                    style={{
                        background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)',
                        animation: 'chatbot-pulse 3s ease-in-out infinite',
                    }}
                    title="AI Assistant"
                >
                    <Sparkles className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
                    style={{
                        width: 'min(400px, calc(100vw - 48px))',
                        height: 'min(600px, calc(100vh - 100px))',
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset',
                        animation: 'chatbot-slide-in 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)' }}>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">AlloySphere AI</h3>
                                <p className="text-caption text-white/70 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-300 inline-block" />
                                    Online • Ready to help
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/20 text-white/80 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ background: 'linear-gradient(180deg, rgba(46,139,87,0.02) 0%, transparent 30%)' }}>
                        {messages.length === 0 && (
                            <div className="text-center py-6">
                                <div className="h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(46,139,87,0.1), rgba(0,71,171,0.08))' }}>
                                    <Sparkles className="h-8 w-8" style={{ color: '#2E8B57' }} />
                                </div>
                                <h4 className="text-sm font-semibold mb-1">How can I help?</h4>
                                <p className="text-xs text-muted-foreground mb-5">
                                    Ask me about {user.role === 'founder' ? 'hiring, milestones, or funding' : user.role === 'investor' ? 'deal flow, risk, or portfolio' : 'projects, payments, or trust score'}
                                </p>
                                {/* Quick Actions */}
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {suggestions.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => handleSend(s)}
                                            className="text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
                                            style={{ background: 'rgba(46,139,87,0.08)', border: '1px solid rgba(46,139,87,0.15)', color: '#2E8B57' }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                                {msg.role === 'assistant' && (
                                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)' }}>
                                        <Bot className="h-3.5 w-3.5 text-white" />
                                    </div>
                                )}
                                <div
                                    className="max-w-[80%] text-sm leading-relaxed rounded-2xl px-4 py-2.5"
                                    style={
                                        msg.role === 'user'
                                            ? { background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)', color: 'white', borderBottomRightRadius: '4px' }
                                            : { background: 'rgba(0,0,0,0.04)', color: 'inherit', borderBottomLeftRadius: '4px' }
                                    }
                                >
                                    {msg.content.split('\n').map((line, i) => (
                                        <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                                    ))}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: 'rgba(0,0,0,0.06)' }}>
                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start gap-2">
                                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)' }}>
                                    <Bot className="h-3.5 w-3.5 text-white" />
                                </div>
                                <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.04)', borderBottomLeftRadius: '4px' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="h-2 w-2 rounded-full" style={{ background: '#2E8B57', animation: `typing-dot 1.4s ease-in-out infinite ${i * 0.2}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask AlloySphere AI..."
                                rows={1}
                                className="flex-1 resize-none text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 transition-all"
                                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading}
                                className="p-2.5 rounded-xl transition-all duration-200 disabled:opacity-30 hover:scale-105 active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)', color: 'white' }}
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-caption text-muted-foreground/50 text-center mt-2">Powered by AlloySphere AI</p>
                    </div>
                </div>
            )}
        </>
    );
}
