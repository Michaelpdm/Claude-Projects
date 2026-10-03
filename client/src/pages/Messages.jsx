import { useState, useEffect, useRef } from 'react';
import { MessageSquare, RefreshCw, Phone, ChevronLeft } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const bottomRef = useRef();

  const fetchConversations = async () => {
    const data = await apiFetch('/api/messages').then(r => r.json());
    setConversations(data);
  };

  const fetchMessages = async (phone) => {
    setLoading(true);
    const data = await apiFetch(`/api/messages/${phone}`).then(r => r.json());
    setMessages(data);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected.phone_number);
    const interval = setInterval(() => fetchMessages(selected.phone_number), 15000);
    return () => clearInterval(interval);
  }, [selected]);

  const openConversation = (c) => {
    setSelected(c);
    setShowThread(true);
  };

  const fmtTime = (t) => new Date(t).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });

  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold text-zinc-50">Messages</h2>
        <button className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400" onClick={fetchConversations}>
          <RefreshCw size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
            No messages yet
          </div>
        ) : conversations.map(c => (
          <button
            key={c.phone_number}
            className={`w-full text-left px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800 transition-colors ${selected?.phone_number === c.phone_number ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''}`}
            onClick={() => openConversation(c)}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-zinc-50 truncate">{c.phone_number}</p>
                <p className="text-xs text-zinc-500 truncate">{c.last_message}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{fmtTime(c.last_message_time)}</p>
              </div>
              <span className={`text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full ${c.last_direction === 'incoming' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-800 text-zinc-400'}`}>
                {c.last_direction === 'incoming' ? 'in' : 'out'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const MessageThread = () => (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 md:hidden"
          onClick={() => setShowThread(false)}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Phone size={16} className="text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-zinc-50 text-sm">{selected.phone_number}</p>
          <p className="text-xs text-zinc-500">{selected.message_count} messages</p>
        </div>
        <button className="ml-auto p-1.5 rounded-lg hover:bg-zinc-800" onClick={() => fetchMessages(selected.phone_number)}>
          <RefreshCw size={15} className="text-zinc-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-zinc-500 pt-10">Loading…</div>
        ) : messages.map(m => (
          <div key={m.id} className={`flex ${m.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
              m.direction === 'outgoing'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-800 rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.message_text}</p>
              <p className={`text-xs mt-1 ${m.direction === 'outgoing' ? 'text-emerald-200' : 'text-zinc-500'}`}>
                {fmtTime(m.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-3">
        <p className="text-xs text-zinc-500 text-center">
          Auto-replies sent when Owner is Away. Manual replies via WhatsApp on your phone.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: show list OR thread */}
      <div className="md:hidden h-[calc(100vh-7rem)]">
        {showThread && selected ? <MessageThread /> : <ConversationList />}
      </div>

      {/* Desktop: side by side */}
      <div className="hidden md:flex h-screen overflow-hidden">
        <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <ConversationList />
        </div>
        <div className="flex-1 flex flex-col bg-zinc-950">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center text-zinc-500">
              <div>
                <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">WhatsApp messages from customers appear here</p>
              </div>
            </div>
          ) : <MessageThread />}
        </div>
      </div>
    </>
  );
}

