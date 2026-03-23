"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, HeartHandshake } from 'lucide-react';

// --- TYPESCRIPT INTERFACES ---
interface LoginResponse {
  status: string;
  token: string;
  user: {
    id: string | number;
    username: string;
    role: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoginTab, setIsLoginTab] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isLoginTab) {
      setErrorMsg('Chức năng đăng ký đang được phát triển, vui lòng quay lại sau nhé!');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const response = await fetch(`${apiUrl}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await response.json();

      if (response.ok && (data.status === 'success' || data.token)) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        router.push('/');
      } else {
        setErrorMsg(data.status || 'Sai email hoặc mật khẩu. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header Section */}
        <div className="bg-pink-500 p-8 text-center text-white">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 rounded-full shadow-inner">
              <HeartHandshake size={40} className="text-pink-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-wider mb-2">TINDER CLONE</h1>
          <p className="text-pink-100 text-sm">Tìm kiếm một nửa của bạn ngay hôm nay</p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          {/* Tabs Đăng nhập / Đăng ký */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => { setIsLoginTab(true); setErrorMsg(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLoginTab ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => { setIsLoginTab(false); setErrorMsg(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLoginTab ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Báo lỗi */}
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center animate-in fade-in">
                {errorMsg}
              </div>
            )}

            {/* Input Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={20} className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all outline-none text-gray-700 placeholder-gray-400"
                placeholder="Địa chỉ Email"
              />
            </div>

            {/* Input Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={20} className="text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all outline-none text-gray-700 placeholder-gray-400"
                placeholder="Mật khẩu"
              />
            </div>

            {/* Button Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-pink-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <><Loader2 size={20} className="animate-spin" /> Đang xử lý...</>
              ) : (
                isLoginTab ? 'Đăng nhập ngay' : 'Tạo tài khoản'
              )}
            </button>
          </form>

          {isLoginTab && (
            <div className="mt-6 text-center">
              <a href="#" className="text-sm text-pink-500 hover:text-pink-600 hover:underline">
                Quên mật khẩu?
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
