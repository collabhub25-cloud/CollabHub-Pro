'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

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

    const handleSend = async () => {
        const msg = input.trim();
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
                // Guard against duplicate assistant responses
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

    return (
        <>
            {/* Trigger button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'var(--role-accent)', color: '#FBF9F6' }}
                    title="Open assistant"
                >
                    <MessageSquare className="h-5 w-5" />
                </button>
            )}

            {/* Side panel */}
            {isOpen && (
                <div
                    className="fixed bottom-0 right-0 z-50 h-full w-full sm:w-96 flex flex-col border-l"
                    style={{ background: '#FBF9F6', borderColor: '#D8D2C8' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#D8D2C8' }}>
                        <span className="text-sm font-medium" style={{ color: '#2A2623' }}>Assistant</span>
                        <button onClick={() => setIsOpen(false)} className="p-1" style={{ color: '#6C635C' }}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-sm" style={{ color: '#6C635C' }}>
                                    Ask me about {user.role === 'founder' ? 'hiring, milestones, agreements, or funding' : user.role === 'investor' ? 'deal flow, risk, portfolio, or due diligence' : 'finding roles, payments, or trust score'}.
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className="max-w-[85%] text-sm leading-relaxed rounded px-3 py-2"
                                    style={
                                        msg.role === 'user'
                                            ? { background: '#EDE9E3', color: '#2A2623', borderLeft: '2px solid var(--role-accent)' }
                                            : { background: '#F0ECE6', color: '#2A2623' }
                                    }
                                >
                                    {msg.content.split('\n').map((line, i) => (
                                        <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="px-3 py-2 rounded" style={{ background: '#F0ECE6' }}>
                                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#6C635C' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="border-t px-4 py-3" style={{ borderColor: '#D8D2C8' }}>
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question..."
                                rows={1}
                                className="flex-1 resize-none text-sm px-3 py-2 rounded focus:outline-none"
                                style={{ background: '#F4F2ED', border: '1px solid #D8D2C8', color: '#2A2623' }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="p-2 rounded transition-colors disabled:opacity-30"
                                style={{ background: 'var(--role-accent)', color: '#FBF9F6' }}
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
