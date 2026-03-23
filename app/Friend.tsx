"use client";

import React, { useState, useEffect } from 'react';
import { UserPlus, Users as UsersIcon, MoreHorizontal } from 'lucide-react';
import { getImageUrl } from './PostFeed';

interface FriendData {
    UserID: string;
    Username: string;
    AvatarURL: string;
}

interface FriendRequest {
    id: string;
    requester_id: string;
    receiver_id: string;
    status: string;
    created_at: string;
    requester: {
        user_id: string;
        username: string;
        avatar_url: string;
    };
}

export default function Friend({ token, handleLogout }: { token: string, handleLogout: () => void }) {
    const [friends, setFriends] = useState<FriendData[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
            const headers = { 'Authorization': `Bearer ${token}` };

            try {
                const [friendsRes, requestsRes] = await Promise.all([
                    fetch(`${apiUrl}/friend/list`, { headers }),
                    fetch(`${apiUrl}/friend/requests`, { headers })
                ]);

                if (friendsRes.ok) {
                    const fData = await friendsRes.json();
                    setFriends(fData.friends || []);
                } else if (friendsRes.status === 401) {
                    handleLogout();
                    return;
                }

                if (requestsRes.ok) {
                    const rData = await requestsRes.json();
                    setRequests(rData.requests || []);
                }
            } catch (err) {
                console.error('Lỗi khi tải dữ liệu bạn bè:', err);
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
                <div className="text-gray-500 font-medium animate-pulse">Đang tải danh sách...</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col p-4 md:p-6 gap-6">

            {/* PHẦN 1: Lời mời kết bạn */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="text-pink-500" size={24} />
                        Lời mời kết bạn
                    </h2>
                    <span className="bg-red-100 text-red-600 font-semibold px-2.5 py-0.5 rounded-full text-sm">
                        {requests.length}
                    </span>
                </div>

                {requests.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {requests.map((req) => (
                            <div key={req.id} className="border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                                <img
                                    src={getImageUrl(req.requester?.avatar_url)}
                                    alt="Avatar"
                                    className="w-20 h-20 rounded-full object-cover shadow-sm mb-3 ring-2 ring-gray-50"
                                />
                                <span className="font-semibold text-gray-900 mb-1">
                                    {req.requester?.username || "Người dùng ẩn danh"}
                                </span>
                                <span className="text-xs text-gray-500 mb-4">
                                    Vừa gửi lời mời
                                </span>
                                <div className="flex w-full gap-2 mt-auto">
                                    <button className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-1.5 rounded-lg font-medium transition-colors text-sm">
                                        Xác nhận
                                    </button>
                                    <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg font-medium transition-colors text-sm">
                                        Xoá
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                        <UserPlus size={40} className="text-gray-300 mb-3" />
                        <p>Không có lời mời kết bạn nào.</p>
                    </div>
                )}
            </div>

            {/* PHẦN 2: Danh sách bạn bè */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <UsersIcon className="text-blue-500" size={24} />
                        Bạn bè
                    </h2>
                    <span className="text-gray-500 font-medium text-sm">
                        {friends.length} người bạn
                    </span>
                </div>

                {friends.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {friends.map((friend) => (
                            <div key={friend.UserID} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3 cursor-pointer">
                                    <img
                                        src={getImageUrl(friend.AvatarURL)}
                                        alt={friend.Username}
                                        className="w-14 h-14 rounded-full object-cover shadow-sm"
                                    />
                                    <div>
                                        <div className="font-semibold text-gray-900 text-sm md:text-base">{friend.Username}</div>
                                        <div className="text-xs text-gray-500">Bạn bè</div>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                        <UsersIcon size={40} className="text-gray-300 mb-3" />
                        <p>Bạn chưa có người bạn nào.</p>
                    </div>
                )}
            </div>

        </div>
    );
}