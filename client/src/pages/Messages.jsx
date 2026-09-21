import { useState, useEffect, useRef } from 'react';
import { MessageSquare, RefreshCw, Phone } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const fmtTime = (t) => new Date(t).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversation List */}
      <div className="w-72 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Messages</h2>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={fetchConversations}>
            <RefreshCw size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
              No messages yet
            </div>
          ) : conversations.map(c => (
            <button
              key={c.phone_number}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected?.phone_number === c.phone_number ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''}`}
              onClick={() => setSelected(c)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">{c.phone_number}</p>
                  <p className="text-xs text-gray-400 truncate">{c.last_message}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{fmtTime(c.last_message_time)}</p>
                </div>
                <span className={`text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full ${c.last_direction === 'incoming' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.last_direction === 'incoming' ? 'in' : 'out'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400">
            <div>
              <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm mt-1">WhatsApp messages from customers appear here</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
                <Phone size={16} className="text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selected.phone_number}</p>
                <p className="text-xs text-gray-400">{selected.message_count} messages</p>
              </div>
              <button className="ml-auto p-1.5 rounded-lg hover:bg-gray-100" onClick={() => fetchMessages(selected.phone_number)}>
                <RefreshCw size={15} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loading ? (
                <div className="text-center text-gray-400 pt-10">Loadingâ€¦</div>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                    m.direction === 'outgoing'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.message_text}</p>
                    <p className={`text-xs mt-1 ${m.direction === 'outgoing' ? 'text-violet-200' : 'text-gray-400'}`}>
                      {fmtTime(m.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="bg-white border-t border-gray-100 px-6 py-3">
              <p className="text-xs text-gray-400 text-center">
                Auto-replies are sent when Owner is set to Away in Settings. Manual replies via WhatsApp on your phone.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

