"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Heart,
  Users,
  MessageCircle,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import PostFeed, { getImageUrl } from './PostFeed';
import Profile from './Profile';
import Friend from './Friend';
import Messenger from './Messenger';
import webSocketService from './websocketService';
import CreatePostModal from './CreatePostModal';
import Notification from './Notification';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string | number, username: string, avatar_url?: string } | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshFeedKey, setRefreshFeedKey] = useState(0);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/login');
    } else {
      setToken(t);

      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch (e) { }
      }

      const fetchProfile = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
          const response = await fetch(`${apiUrl}/user/profile`, {
            headers: { 'Authorization': `Bearer ${t}` }
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.user) {
              const userData = {
                id: data.user.id,
                username: data.user.username,
                avatar_url: data.user.avatar_url
              };
              setCurrentUser(userData);
              localStorage.setItem('currentUser', JSON.stringify(userData));
            }
          }
        } catch (err) {
          console.error('Lỗi khi tải profile:', err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();

      webSocketService.connect(t);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Heart className="text-pink-500 animate-pulse" size={48} fill="currentColor" />
          <div className="text-pink-500 font-semibold tracking-widest animate-pulse">TINDER CLONE</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full mx-auto bg-gray-100 shadow-2xl relative sm:border-x sm:border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${['profile', 'users'].includes(activeTab) ? 'max-w-4xl' : 'max-w-lg'}`}>

      {/* Header CHUNG */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div
            onClick={() => setActiveTab('home')}
            className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500 tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
          >
            TINDER CLONE
          </div>
          <div className="flex items-center gap-3">
            {/* Component Messenger nằm góc trên cùng */}
            {token && <Messenger />}
            {token && <Notification />}
          </div>
        </div>
      </header>

      {/* KHU VỰC HIỂN THỊ CHÍNH DỰA VÀO TAB */}
      <main className="pb-[80px] flex-1">
        {/* TAB HOME (PostFeed) */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-300">
            {/* Post Creation Trigger */}
            <div className="bg-white p-4 mb-3 shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src={getImageUrl(currentUser?.avatar_url)}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-gray-100"
                />
                <div
                  onClick={() => setIsCreatePostOpen(true)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 cursor-pointer rounded-full px-4 py-2.5 text-gray-500 text-[15px] transition-colors font-medium"
                >
                  {currentUser?.username || "Bạn"} ơi, bạn đang nghĩ gì?
                </div>
              </div>
            </div>
            {/* Feed */}
            {token && <PostFeed key={refreshFeedKey} token={token} />}
          </div>
        )}

        {/* TAB USERS (Bạn bè) */}
        {activeTab === 'users' && token && (
          <div className="animate-in fade-in duration-300">
            <Friend token={token} handleLogout={handleLogout} />
          </div>
        )}

        {/* TAB PROFILE (Trang cá nhân) */}
        {activeTab === 'profile' && token && (
          <div className="animate-in fade-in duration-300">
            <Profile token={token} handleLogout={handleLogout} />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 w-full bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-30 transition-all duration-300 ease-in-out ${['profile', 'users'].includes(activeTab) ? 'max-w-4xl' : 'max-w-lg'}`}>
        <div className="flex justify-around items-center h-[65px] px-2">
          <NavButton icon={<Heart size={26} />} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavButton icon={<Users size={26} />} active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <NavButton icon={<UserIcon size={26} />} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <NavButton icon={<LogOut size={26} />} onClick={handleLogout} isDanger />
        </div>
      </nav>

      {/* --- MODAL ĐĂNG BÀI CHUNG TẠI HOME --- */}
      {token && (
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          currentUser={currentUser}
          token={token}
          onPostCreated={() => setRefreshFeedKey(prev => prev + 1)} // Gọi để refresh Feed
        />
      )}
    </div>
  );
}

function NavButton({ icon, active, onClick, isDanger }: { icon: React.ReactNode, active?: boolean, onClick?: () => void, isDanger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-xl transition-all duration-200 active:scale-90 flex flex-col items-center justify-center w-14 h-14
        ${active ? 'text-pink-500' : isDanger ? 'text-gray-400 hover:bg-red-50 hover:text-red-500' : 'text-gray-400 hover:bg-pink-50 hover:text-pink-400'}`}
    >
      {/* Tự động fill máu cho icon nếu nó đang Active */}
      {React.cloneElement(icon as React.ReactElement<any>, {
        fill: active && !isDanger ? 'currentColor' : 'none',
        strokeWidth: active && !isDanger ? 2.5 : 2
      })}
      {active && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 absolute bottom-1"></span>}
    </button>
  );
}