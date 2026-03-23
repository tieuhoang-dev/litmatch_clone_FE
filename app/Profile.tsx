"use client";

import React, { useState, useEffect } from 'react';
import { User, Cake, Info, BadgeCheck, Edit, PlusSquare, Image as ImageIcon } from 'lucide-react';
import { Post, PostCard, getImageUrl } from './PostFeed';

interface ProfileData {
    id: string;
    avatar_url: string;
    username: string;
    full_name: string;
    bio: string;
    date_of_birth: string;
    gender: string;
}

interface Friend {
    UserID: string;
    Username: string;
    AvatarURL: string;
}

export default function Profile({ token, handleLogout }: { token: string, handleLogout: () => void }) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
            const headers = { 'Authorization': `Bearer ${token}` };

            try {
                const [profileRes, friendsRes, postsRes] = await Promise.all([
                    fetch(`${apiUrl}/user/profile`, { headers }),
                    fetch(`${apiUrl}/friend/list`, { headers }),
                    fetch(`${apiUrl}/interact/post/me`, { headers })
                ]);

                if (profileRes.ok) {
                    const pData = await profileRes.json();
                    setProfile(pData.user);
                } else if (profileRes.status === 401) {
                    handleLogout();
                    return;
                }

                if (friendsRes.ok) {
                    const fData = await friendsRes.json();
                    setFriends(fData.friends || []);
                }

                if (postsRes.ok) {
                    const postData = await postsRes.json();
                    setPosts(postData.posts || []);
                }
            } catch (err) {
                console.error('Lỗi khi tải dữ liệu trang cá nhân:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [token, handleLogout]);

    if (isLoading) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
                <div className="text-gray-500 font-medium animate-pulse">Đang tải hồ sơ...</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col pb-4">
            {/* PHẦN TRÊN: Banner thông tin cá nhân */}
            <div className="bg-white p-6 shadow-sm border-b border-gray-200">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <img
                            src={getImageUrl(profile?.avatar_url)}
                            alt="Avatar"
                            className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover shadow-md ring-4 ring-pink-50"
                        />
                        <div className="flex flex-col items-center md:items-start">
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                {profile?.username || "Người dùng"}
                                <BadgeCheck size={20} className="text-blue-500" fill="currentColor" />
                            </h1>
                            <span className="text-gray-500 font-medium mt-1">{friends.length} người bạn</span>

                            <div className="mt-4">
                                <button className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-lg font-semibold transition-colors shadow-sm active:scale-95 text-sm">
                                    <PlusSquare size={18} /> Thêm bài đăng
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-shrink-0 mt-2 md:mt-0">
                        <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-semibold transition-colors active:scale-95 text-sm">
                            <Edit size={18} /> Chỉnh sửa hồ sơ
                        </button>
                    </div>
                </div>
            </div>

            {/* PHẦN DƯỚI: Chia 2 cột dọc */}
            <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6 items-start">
                {/* CỘT TRÁI (30%) */}
                <div className="w-full md:w-[35%] flex flex-col gap-6 sticky md:top-[85px]">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Giới thiệu</h2>
                        <div className="flex flex-col gap-3 text-[14px] text-gray-700">
                            {profile?.full_name && (<div className="flex items-center gap-3"><User size={20} className="text-gray-400" /><span>Tên thật: <strong>{profile.full_name}</strong></span></div>)}
                            {profile?.date_of_birth && (<div className="flex items-center gap-3"><Cake size={20} className="text-gray-400" /><span>Sinh nhật: <strong>{new Date(profile.date_of_birth).toLocaleDateString('vi-VN')}</strong></span></div>)}
                            {profile?.bio && (<div className="flex items-start gap-3 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100"><Info size={20} className="text-gray-400 shrink-0 mt-0.5" /><span className="italic">"{profile.bio}"</span></div>)}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex justify-between items-end mb-4">
                            <div><h2 className="text-lg font-bold text-gray-900">Bạn bè</h2><span className="text-[13px] text-gray-500">{friends.length} người bạn</span></div>
                            <button className="text-pink-500 text-[13px] hover:underline font-medium">Xem tất cả</button>
                        </div>
                        {friends.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                                {friends.slice(0, 9).map((friend) => (
                                    <div key={friend.UserID} className="flex flex-col items-center gap-1 cursor-pointer group">
                                        <img src={getImageUrl(friend.AvatarURL)} alt={friend.Username} className="w-full aspect-square rounded-lg object-cover group-hover:brightness-90 transition-all border border-gray-100 shadow-sm" />
                                        <span className="text-[12px] font-semibold text-gray-700 truncate w-full text-center group-hover:text-pink-500 mt-1">{friend.Username}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-gray-500 text-sm text-center py-4">Chưa có bạn bè nào.</p>)}
                    </div>
                </div>

                {/* CỘT PHẢI (70%) */}
                <div className="w-full md:w-[65%] flex flex-col gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-1">
                        <h2 className="text-lg font-bold text-gray-900">Bài viết của bạn</h2>
                    </div>
                    {posts.length > 0 ? posts.map(post => (
                        <div className="rounded-xl overflow-hidden shadow-sm" key={post.id}><PostCard post={post} /></div>
                    )) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><ImageIcon size={28} className="text-gray-400" /></div>
                            <h3 className="text-gray-900 font-bold text-lg">Chưa có bài viết nào</h3>
                            <p className="text-gray-500 text-sm mt-1">Khi bạn chia sẻ điều gì đó, bài viết sẽ xuất hiện tại đây.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}