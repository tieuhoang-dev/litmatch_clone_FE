"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import webSocketService from './websocketService';

export default function Notification() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Lấy danh sách thông báo khi mở dropdown
    useEffect(() => {
        if (isOpen) {
            webSocketService.sendMessage({ type: 'load_notification', page: 0, page_size: 20 });
            setUnreadCount(0); // Đã xem nên reset biến đếm
        }
    }, [isOpen]);

    // Lắng nghe sự kiện từ WebSocket
    useEffect(() => {
        const handleNewNotification = (data: any) => {
            setNotifications(prev => [data, ...prev]);
            if (!isOpen) {
                setUnreadCount(prev => prev + 1);
            }
        };

        const handleLoadNotifications = (data: any) => {
            if (data.page === 0) {
                setNotifications(data.notifications || []);
            } else {
                setNotifications(prev => [...prev, ...(data.notifications || [])]);
            }
        };

        webSocketService.on('notification', handleNewNotification);
        webSocketService.on('notifications', handleLoadNotifications);

        return () => {
            webSocketService.off('notification', handleNewNotification);
            webSocketService.off('notifications', handleLoadNotifications);
        };
    }, [isOpen]);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-gray-100 rounded-full relative transition-colors text-gray-700">
                <Bell size={22} />
                {unreadCount > 0 && <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 flex flex-col max-h-[400px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-gray-100 font-bold text-gray-800">Thông báo</div>
                    <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1 custom-scrollbar">
                        {notifications.length > 0 ? notifications.map(n => (
                            <div key={n.id || Math.random()} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                                <div className="bg-pink-100 p-2 rounded-full text-pink-500 shrink-0"><Bell size={18} fill="currentColor" /></div>
                                <div className="flex-1"><div className="text-[14px] text-gray-800 leading-snug">{n.content}</div>{n.timestamp && <div className="text-[11px] text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString('vi-VN')}</div>}</div>
                            </div>
                        )) : (<div className="text-center p-6 text-sm text-gray-500">Chưa có thông báo nào</div>)}
                    </div>
                </div>
            )}
        </div>
    );
}