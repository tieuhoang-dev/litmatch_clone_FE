"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Phone, Video, X, Image as ImageIcon, Send } from 'lucide-react';
import webSocketService from './websocketService';
import { getImageUrl } from './PostFeed';

export default function Messenger() {
    const [isContactsOpen, setIsContactsOpen] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);

    // Form gửi tin nhắn
    const [inputText, setInputText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Đảm bảo Portal chỉ render trên Client để tránh lỗi Hydration của Next.js
    useEffect(() => {
        setMounted(true);
    }, []);

    // Lấy contacts mỗi khi mở Dropdown
    useEffect(() => {
        if (isContactsOpen) {
            webSocketService.sendMessage({ type: 'load_contacts' });
        }
    }, [isContactsOpen]);

    // Lắng nghe sự kiện socket
    useEffect(() => {
        const handleContacts = (data: any) => {
            if (data.contacts) setContacts(data.contacts);
        };

        const handleHistory = (data: any) => {
            if (activeChat && data.with === activeChat.UserID) {
                setMessages(data.messages || []);
            }
        };

        const handleIncoming = (data: any) => {
            if (activeChat && (data.from === activeChat.UserID || data.to === activeChat.UserID)) {
                setMessages(prev => [...prev, data]);
            }
            // Refresh lại danh sách bạn bè để hiển thị tin nhắn mới nhất
            webSocketService.sendMessage({ type: 'load_contacts' });
        };

        webSocketService.on('contacts', handleContacts);
        webSocketService.on('history', handleHistory);
        webSocketService.on('text', handleIncoming);
        webSocketService.on('image', handleIncoming);

        return () => {
            webSocketService.off('contacts', handleContacts);
            webSocketService.off('history', handleHistory);
            webSocketService.off('text', handleIncoming);
            webSocketService.off('image', handleIncoming);
        };
    }, [activeChat]);

    // Auto scroll xuống tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const openChat = (contact: any) => {
        setActiveChat(contact);
        setIsContactsOpen(false);
        setMessages([]);
        webSocketService.sendMessage({ type: 'load_history', with: contact.UserID, page: 0, page_size: 50 });
        webSocketService.sendMessage({ type: 'seen', with: contact.UserID });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSend = () => {
        if (!inputText.trim() && !previewUrl) return;

        if (previewUrl && selectedFile) {
            // Sử dụng FileReader để convert sang base64 phục vụ realtime cho demo.
            // (Thực tế nên upload API rồi gửi Link vào WS)
            const reader = new FileReader();
            reader.onload = () => {
                webSocketService.sendMessage({ type: 'image', to: activeChat.UserID, content: reader.result as string });
            };
            reader.readAsDataURL(selectedFile);
        }

        if (inputText.trim()) {
            webSocketService.sendMessage({ type: 'text', to: activeChat.UserID, content: inputText.trim() });
        }

        setInputText('');
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const totalUnread = contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);

    return (
        <>
            {/* Phím bấm Message & Dropdown Contacts List */}
            <div className="relative">
                <button onClick={() => setIsContactsOpen(!isContactsOpen)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 relative">
                    <MessageCircle size={22} />
                    {totalUnread > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>

                {isContactsOpen && (
                    <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 flex flex-col max-h-[400px] overflow-hidden">
                        <div className="p-3 border-b border-gray-100 font-bold text-gray-800">Tin nhắn</div>
                        <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
                            {contacts.length > 0 ? contacts.map(c => (
                                <div key={c.UserID} onClick={() => openChat(c)} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                                    <div className="relative">
                                        <img src={getImageUrl(c.avatar)} className="w-12 h-12 rounded-full object-cover" alt="avatar" />
                                        {c.status === 'active' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="font-semibold text-sm text-gray-900 truncate">{c.username}</div>
                                        <div className={`text-xs truncate ${c.unread_count > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{c.last_message}</div>
                                    </div>
                                    {c.unread_count > 0 && <div className="w-2.5 h-2.5 bg-pink-500 rounded-full"></div>}
                                </div>
                            )) : (
                                <div className="text-center p-4 text-sm text-gray-500">Chưa có tin nhắn nào</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Hộp thoại Chat Floating Box */}
            {activeChat && mounted && createPortal(
                <div className="fixed bottom-[80px] sm:bottom-0 right-2 sm:right-6 md:right-12 lg:right-24 w-[calc(100vw-16px)] sm:w-[350px] h-[460px] max-h-[80vh] bg-white rounded-2xl sm:rounded-b-none sm:rounded-t-2xl shadow-[0_-5px_40px_rgba(0,0,0,0.15)] flex flex-col z-[100] border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-8 duration-200">

                    {/* Phần 1: Header (15%) */}
                    <div className="h-[15%] min-h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-3 cursor-pointer">
                            <img src={getImageUrl(activeChat.avatar)} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="avatar" />
                            <div className="font-bold text-[16px] text-gray-800">{activeChat.username}</div>
                        </div>
                        <div className="flex items-center text-pink-500">
                            <button className="p-2 hover:bg-pink-50 rounded-full transition-colors"><Phone size={20} fill="currentColor" /></button>
                            <button className="p-2 hover:bg-pink-50 rounded-full transition-colors"><Video size={20} fill="currentColor" /></button>
                            <button onClick={() => setActiveChat(null)} className="p-2 hover:bg-gray-100 text-gray-400 rounded-full transition-colors ml-1"><X size={22} /></button>
                        </div>
                    </div>

                    {/* Phần 2: Messages (75%) */}
                    <div className="h-[75%] flex-1 bg-gray-50 p-4 overflow-y-auto flex flex-col gap-3 relative">
                        {messages.map((msg, idx) => {
                            const isMe = msg.from !== activeChat.UserID;
                            return (
                                <div key={msg.id || idx} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                                    <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isMe ? 'bg-pink-500 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                                        {msg.type === 'image' ? (
                                            <img src={msg.content.startsWith('data:') ? msg.content : getImageUrl(msg.content)} className="rounded-lg max-w-full" alt="img" />
                                        ) : (
                                            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Phần 3: Input Footer (10%) */}
                    <div className="h-[10%] min-h-[65px] bg-white px-3 py-2 border-t border-gray-100 flex items-center gap-2 relative shrink-0">
                        {/* Hình preview sẽ nằm lửng lơ ở trên khung Input */}
                        {previewUrl && (
                            <div className="absolute bottom-full mb-3 left-3 w-20 h-20 bg-white border border-gray-200 p-1 rounded-xl shadow-lg z-10"><img src={previewUrl} className="w-full h-full object-cover rounded-lg" alt="preview" /><button onClick={() => { setPreviewUrl(null); setSelectedFile(null); fileInputRef.current!.value = ''; }} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-gray-700"><X size={12} /></button></div>
                        )}

                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-pink-500 hover:bg-pink-50 rounded-full transition-colors shrink-0"><ImageIcon size={24} /></button>
                        <input type="text" placeholder="Nhắn tin..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-gray-100 text-gray-800 text-[15px] rounded-full px-4 py-2.5 outline-none focus:ring-1 focus:ring-pink-300" />
                        <button onClick={handleSend} className={`p-2 rounded-full transition-colors shrink-0 ${inputText.trim() || previewUrl ? 'text-pink-500 hover:bg-pink-50' : 'text-gray-300'}`}><Send size={24} className={inputText.trim() || previewUrl ? 'fill-current' : ''} /></button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}