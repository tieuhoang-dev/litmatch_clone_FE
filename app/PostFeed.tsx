"use client";

import React, { useState, useEffect } from 'react';
import { MoreHorizontal, ThumbsUp, MessageSquare, UserPlus, Check } from 'lucide-react';
import webSocketService from './websocketService';

export interface Post {
    id: string;
    content: string;
    created_at: string;
    user: {
        user_id: string;
        username: string;
        avatar_url: string;
    };
    media?: {
        url: string;
        type: string;
    }[];
    like_count: number;
    comment_count: number;
    is_liked: boolean;
}

export const getImageUrl = (url?: string) => {
    if (!url) return 'https://i.pravatar.cc/150?u=current';
    if (url.startsWith('http')) return url;
    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace('/api', '');
    return `${baseUrl}${url}`;
};

export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function PostFeed({ token }: { token: string }) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [friendsIds, setFriendsIds] = useState<Set<string>>(new Set());
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try { setCurrentUser(JSON.parse(userStr)); } catch (e) { }
        }

        const fetchPostsAndFriends = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
                const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

                // Tải danh sách bạn bè để check xem đã kết bạn chưa
                fetch(`${apiUrl}/friend/list`, { method: 'GET', headers })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data && data.friends) {
                            setFriendsIds(new Set(data.friends.map((f: any) => f.UserID)));
                        }
                    }).catch(e => console.error(e));

                // Tải bài viết
                const response = await fetch(`${apiUrl}/interact/post`, {
                    method: 'GET',
                    headers
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.posts) {
                        setPosts(data.posts);
                    }
                } else if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('currentUser');
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error("Lỗi khi tải bài viết:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (token) {
            fetchPostsAndFriends();
        }
    }, [token]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                <p className="text-gray-500 font-medium">Đang tải bài viết...</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <MessageSquare size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">Chưa có bài viết nào.</p>
                <p className="text-gray-400 text-sm mt-1">Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 pb-4">
            {posts.map(post => (
                <PostCard key={post.id} post={post} currentUser={currentUser} isFriend={friendsIds.has(post.user.user_id)} token={token} />
            ))}
        </div>
    );
}

export function PostCard({ post, currentUser: propUser, isFriend, token }: { post: Post, currentUser?: any, isFriend?: boolean, token?: string }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRequested, setIsRequested] = useState(false);

    // Fallback lấy currentUser từ local nếu component dùng lẻ ở file Profile.tsx
    const [localUser, setLocalUser] = useState<any>(propUser);
    useEffect(() => {
        if (!propUser) {
            const str = localStorage.getItem('currentUser');
            if (str) try { setLocalUser(JSON.parse(str)); } catch (e) { }
        } else {
            setLocalUser(propUser);
        }
    }, [propUser]);

    const isMe = localUser && String(localUser.id) === String(post.user.user_id);
    const showAddFriend = !isMe && !isFriend && !isRequested;

    const handleAddFriend = async () => {
        setIsRequested(true);
        try {
            const t = token || localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/friend/request`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: post.user.user_id })
            });
            if (res.ok) {
                // Gửi thông báo Notification qua WebSocket
                webSocketService.sendMessage({ type: 'notification', to: post.user.user_id, content: `${localUser?.username || 'Ai đó'} đã gửi cho bạn một lời mời kết bạn.` });
            } else {
                setIsRequested(false);
            }
        } catch (err) { setIsRequested(false); }
    };

    return (
        <div className="bg-white flex flex-col sm:border-y border-y sm:border-x sm:border-gray-100 sm:rounded-xl shadow-sm overflow-visible border-gray-100">
            {/* Header bài đăng */}
            <div className="p-4 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <img src={getImageUrl(post.user.avatar_url)} alt={post.user.username} className="w-11 h-11 rounded-full object-cover shadow-sm ring-1 ring-gray-100" />
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="font-semibold text-[15px] text-gray-900">{post.user.username}</div>
                            {showAddFriend && (
                                <button onClick={handleAddFriend} title="Thêm bạn bè" className="text-pink-500 hover:bg-pink-50 p-1 rounded-full transition-colors active:scale-95">
                                    <UserPlus size={16} strokeWidth={2.5} />
                                </button>
                            )}
                            {isRequested && (
                                <div title="Đã gửi lời mời" className="text-gray-400 p-1"><Check size={16} strokeWidth={3} /></div>
                            )}
                        </div>
                        <div className="text-[13px] text-gray-500 flex items-center gap-1">
                            {formatDate(post.created_at)} •
                            <span className="text-gray-400">🌐</span>
                        </div>
                    </div>
                </div>

                {/* Nút 3 chấm & Dropdown Menu */}
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <MoreHorizontal size={20} className="text-gray-500" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white shadow-xl rounded-xl border border-gray-100 py-2 z-20">
                            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                                Lưu bài viết
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600 transition-colors">
                                Báo cáo bài đăng
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Nội dung text của bài viết */}
            {post.content && (
                <div className="px-4 pb-3 text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                </div>
            )}

            {/* Content bài đăng - Media */}
            {post.media && post.media.length > 0 && (
                <div className="w-full bg-gray-50 flex items-center justify-center border-y border-gray-100">
                    {post.media[0].type === 'video' ? (
                        <video
                            src={getImageUrl(post.media[0].url)}
                            controls
                            className="w-full max-h-[600px] object-contain bg-black"
                        />
                    ) : (
                        <img
                            src={getImageUrl(post.media[0].url)}
                            alt="Post content"
                            className="w-full h-auto max-h-[600px] object-contain"
                            loading="lazy"
                        />
                    )}
                </div>
            )}

            {/* Footer bài đăng */}
            <div className="px-4 py-3 flex flex-col">
                {/* Phần trên: Số like & comment */}
                <div className="flex justify-between items-center text-[13px] text-gray-500 mb-3 px-1">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
                        <div className="bg-pink-500 rounded-full p-1"><ThumbsUp size={10} className="text-white" fill="currentColor" /></div>
                        <span>{post.like_count} lượt thích</span>
                    </div>
                    <div className="cursor-pointer hover:underline">
                        {post.comment_count} bình luận
                    </div>
                </div>

                {/* Phần dưới: 2 nút Tương tác */}
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <button className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-[14px] font-semibold transition-colors ${post.is_liked ? 'text-pink-600' : 'text-gray-600'}`}>
                        <ThumbsUp size={20} className={post.is_liked ? 'fill-current' : ''} /> Thích
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-gray-600 text-[14px] font-semibold transition-colors">
                        <MessageSquare size={20} /> Bình luận
                    </button>
                </div>
            </div>
        </div>
    );
}