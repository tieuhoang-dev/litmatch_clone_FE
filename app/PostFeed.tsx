"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, ThumbsUp, MessageSquare, UserPlus, Check, X, Send } from 'lucide-react';
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

export interface CommentData {
    id: string;
    content: string;
    created_at: string;
    parent_id?: string;
    user: {
        user_id: string;
        username: string;
        avatar_url: string;
    };
    children?: CommentData[];
}

export interface PostDetailData extends Post {
    comments: CommentData[];
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

// Hàm chuyển đổi mảng phẳng thành cấu trúc cây dựa vào parent_id
const buildCommentTree = (comments: CommentData[]) => {
    const commentMap: { [key: string]: CommentData } = {};
    const roots: CommentData[] = [];

    comments.forEach(c => {
        commentMap[c.id] = { ...c, children: [] };
    });

    comments.forEach(c => {
        if (c.parent_id && commentMap[c.parent_id]) {
            commentMap[c.parent_id].children!.push(commentMap[c.id]);
        } else {
            roots.push(commentMap[c.id]);
        }
    });

    return roots;
};

function CommentNode({ comment, isReply = false, onReply, onDelete, currentUser }: { comment: CommentData, isReply?: boolean, onReply: (c: CommentData) => void, onDelete: (c: CommentData) => void, currentUser: any }) {
    const isMe = currentUser && String(currentUser.id) === String(comment.user.user_id);

    return (
        <div className="flex gap-2.5 items-start mt-3 first:mt-0 w-full group">
            <img src={getImageUrl(comment.user.avatar_url)} className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover shrink-0 ring-1 ring-gray-200`} alt="avatar" />
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <div className="bg-white border border-gray-100 px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm inline-flex flex-col self-start max-w-full">
                        <span className="font-bold text-[13px] text-gray-900 leading-tight">{comment.user.username}</span>
                        <span className="text-[14px] text-gray-800 break-words mt-0.5">{comment.content}</span>
                    </div>
                    {isMe && (
                        <button onClick={() => onDelete(comment)} title="Xóa bình luận" className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all shrink-0">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] text-gray-500 font-medium">
                    <span>{formatDate(comment.created_at)}</span>
                    <button onClick={() => onReply(comment)} className="hover:underline font-bold text-gray-600">Phản hồi</button>
                </div>
                {comment.children && comment.children.length > 0 && (
                    <div className="flex flex-col mt-1 w-full">
                        {comment.children.map(child => <CommentNode key={child.id} comment={child} isReply={true} onReply={onReply} onDelete={onDelete} currentUser={currentUser} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

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

                fetch(`${apiUrl}/friend/list`, { method: 'GET', headers })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data && data.friends) {
                            setFriendsIds(new Set(data.friends.map((f: any) => f.UserID)));
                        }
                    }).catch(e => console.error(e));

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
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [postDetail, setPostDetail] = useState<PostDetailData | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [localIsLiked, setLocalIsLiked] = useState(post.is_liked);
    const [localLikeCount, setLocalLikeCount] = useState(post.like_count);
    const [localCommentCount, setLocalCommentCount] = useState(post.comment_count);
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState<CommentData | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    const commentInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        setLocalIsLiked(post.is_liked);
        setLocalLikeCount(post.like_count);
        setLocalCommentCount(post.comment_count);
    }, [post.is_liked, post.like_count, post.comment_count]);

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

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                console.log("✅ Thành công! Đang bắn WS Notification sang user:", post.user.user_id);
                webSocketService.sendMessage({ type: 'notification', to: post.user.user_id, content: `${localUser?.username || 'Ai đó'} đã gửi cho bạn một lời mời kết bạn.` });
            } else {
                console.error("❌ Lỗi API (Bị chặn không gửi WS Notification):", data);
            }
        } catch (err) { setIsRequested(false); }
    };

    const handleLikeToggle = async () => {
        const t = token || localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

        const isCurrentlyLiked = localIsLiked;
        const endpoint = isCurrentlyLiked ? '/interact/post/like/delete' : '/interact/post/like';

        // Cập nhật giao diện lập tức (Optimistic update)
        setLocalIsLiked(!isCurrentlyLiked);
        setLocalLikeCount(prev => isCurrentlyLiked ? prev - 1 : prev + 1);

        if (postDetail) {
            setPostDetail(prev => prev ? {
                ...prev,
                is_liked: !isCurrentlyLiked,
                like_count: isCurrentlyLiked ? prev.like_count - 1 : prev.like_count + 1
            } : prev);
        }

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: isCurrentlyLiked ? 'DELETE' : 'POST',
                headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: post.id })
            });

            if (res.ok) {
                // Bắn thông báo nếu là Like và người đó không tự Like bài của chính mình
                if (!isCurrentlyLiked && localUser && String(localUser.id) !== String(post.user.user_id)) {
                    webSocketService.sendMessage({
                        type: 'notification',
                        to: post.user.user_id,
                        content: `${localUser.username || 'Ai đó'} đã thích bài viết của bạn.`
                    });
                }
            } else { // Khôi phục lại nếu API lỗi
                const errData = await res.text();
                console.error("❌ Lỗi gọi API Like/Unlike:", res.status, errData);
                setLocalIsLiked(isCurrentlyLiked);
                setLocalLikeCount(prev => isCurrentlyLiked ? prev + 1 : prev - 1);
            }
        } catch (err) {
            console.error("❌ Lỗi Network khi gọi API Like/Unlike:", err);
            setLocalIsLiked(isCurrentlyLiked);
            setLocalLikeCount(prev => isCurrentlyLiked ? prev + 1 : prev - 1);
        }
    };

    const handleOpenDetail = async () => {
        setIsDetailOpen(true);
        if (!postDetail) {
            setIsLoadingDetail(true);
            try {
                const t = token || localStorage.getItem('token');
                const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
                const res = await fetch(`${apiUrl}/interact/post/${post.id}`, {
                    headers: { 'Authorization': `Bearer ${t}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPostDetail(data.post);
                }
            } catch (err) {
                console.error("Lỗi khi tải chi tiết bài viết", err);
            } finally {
                setIsLoadingDetail(false);
            }
        }
    };

    // --- BÌNH LUẬN & PHẢN HỒI ---
    const handleReplyClick = (comment: CommentData) => {
        setReplyingTo(comment);
        setCommentText(`@${comment.user.username} `);
        commentInputRef.current?.focus();
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim()) return;
        setIsSubmittingComment(true);

        const t = token || localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
        const endpoint = replyingTo ? '/interact/post/comment/reply' : '/interact/post/comment';
        
        const payload: any = { post_id: post.id, content: commentText.trim() };
        if (replyingTo) payload.parent_id = replyingTo.id; // Truyền thêm ID bình luận gốc

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Gửi Notification
                if (!replyingTo && localUser && String(localUser.id) !== String(post.user.user_id)) {
                    webSocketService.sendMessage({ type: 'notification', to: post.user.user_id, content: `${localUser.username || 'Ai đó'} đã bình luận về bài viết của bạn.` });
                } else if (replyingTo && localUser && String(localUser.id) !== String(replyingTo.user.user_id)) {
                    webSocketService.sendMessage({ type: 'notification', to: replyingTo.user.user_id, content: `${localUser.username || 'Ai đó'} đã trả lời bình luận của bạn.` });
                }

                // Tải lại chi tiết bài viết để hiện bình luận mới ngay lập tức
                const detailRes = await fetch(`${apiUrl}/interact/post/${post.id}`, { headers: { 'Authorization': `Bearer ${t}` } });
                if (detailRes.ok) {
                    const data = await detailRes.json();
                    setPostDetail(data.post);
                    setLocalCommentCount(data.post.comment_count);
                }
                setCommentText('');
                setReplyingTo(null);
            }
        } catch (err) { console.error('Lỗi khi gửi bình luận', err); }
        setIsSubmittingComment(false);
    };

    const handleDeleteComment = async (comment: CommentData) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;

        const t = token || localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

        try {
            const res = await fetch(`${apiUrl}/interact/post/comment/delete`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_id: comment.id })
            });

            if (res.ok) {
                const detailRes = await fetch(`${apiUrl}/interact/post/${post.id}`, { headers: { 'Authorization': `Bearer ${t}` } });
                if (detailRes.ok) {
                    const data = await detailRes.json();
                    setPostDetail(data.post);
                    setLocalCommentCount(data.post.comment_count);
                }
            }
        } catch (err) { console.error('Lỗi khi xóa bình luận', err); }
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
                        <span>{localLikeCount} lượt thích</span>
                    </div>
                    <div onClick={handleOpenDetail} className="cursor-pointer hover:underline">
                        {localCommentCount} bình luận
                    </div>
                </div>

                {/* Phần dưới: 2 nút Tương tác */}
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <button onClick={handleLikeToggle} className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-[14px] font-semibold transition-colors ${localIsLiked ? 'text-pink-600' : 'text-gray-600'}`}>
                        <ThumbsUp size={20} className={localIsLiked ? 'fill-current' : ''} /> Thích
                    </button>
                    <button onClick={handleOpenDetail} className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-gray-600 text-[14px] font-semibold transition-colors">
                        <MessageSquare size={20} /> Bình luận
                    </button>
                </div>
            </div>

            {/* MODAL CHI TIẾT BÀI VIẾT & BÌNH LUẬN */}
            {isDetailOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                        {/* Header Modal */}
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                            <h2 className="font-bold text-lg text-gray-800">Bài viết của {post.user.username}</h2>
                            <button onClick={() => setIsDetailOpen(false)} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Content Modal */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                            {isLoadingDetail ? (
                                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div></div>
                            ) : postDetail ? (
                                <>
                                    {/* User Info */}
                                    <div className="p-4 flex items-center gap-3">
                                        <img src={getImageUrl(postDetail.user.avatar_url)} className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-100" alt="avatar" />
                                        <div>
                                            <div className="font-semibold text-[15px]">{postDetail.user.username}</div>
                                            <div className="text-[12px] text-gray-500">{formatDate(postDetail.created_at)}</div>
                                        </div>
                                    </div>

                                    {/* Text Content */}
                                    {postDetail.content && <div className="px-4 pb-3 text-[15px] leading-relaxed whitespace-pre-wrap">{postDetail.content}</div>}

                                    {/* Media */}
                                    {postDetail.media && postDetail.media.length > 0 && (
                                        <div className="w-full bg-gray-50 flex items-center justify-center border-y border-gray-100">
                                            {postDetail.media[0].type === 'video' ? (
                                                <video src={getImageUrl(postDetail.media[0].url)} controls className="w-full max-h-[400px] object-contain bg-black" />
                                            ) : (
                                                <img src={getImageUrl(postDetail.media[0].url)} className="w-full max-h-[400px] object-contain" alt="media" />
                                            )}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between text-[13px] text-gray-500 font-medium">
                                        <div className="flex items-center gap-1.5"><div className="bg-pink-500 rounded-full p-1"><ThumbsUp size={10} className="text-white" fill="currentColor" /></div> {localLikeCount} lượt thích</div>
                                        <div>{localCommentCount} bình luận</div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-between border-b border-gray-100 px-4 py-1 bg-white">
                                        <button onClick={handleLikeToggle} className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-[14px] font-semibold transition-colors ${localIsLiked ? 'text-pink-600' : 'text-gray-600'}`}>
                                            <ThumbsUp size={20} className={localIsLiked ? 'fill-current' : ''} /> Thích
                                        </button>
                                        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-gray-600 text-[14px] font-semibold transition-colors">
                                            <MessageSquare size={20} /> Bình luận
                                        </button>
                                    </div>

                                    {/* Comment Input */}
                                    {replyingTo && (
                                        <div className="px-4 pt-2 pb-1 bg-gray-50 flex items-center justify-between text-[12px] text-gray-500 border-b border-gray-100">
                                            <span>Đang trả lời <strong>{replyingTo.user.username}</strong></span>
                                            <button onClick={() => { setReplyingTo(null); setCommentText(''); }} className="hover:underline font-medium text-pink-500">Hủy</button>
                                        </div>
                                    )}
                                    <div className="px-4 py-3 flex items-center gap-3 bg-white border-b border-gray-100">
                                        <img src={getImageUrl(localUser?.avatar_url)} className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-100" alt="avatar" />
                                        <div className="flex-1 relative flex items-center">
                                            <input
                                                ref={commentInputRef}
                                                type="text"
                                                placeholder="Viết bình luận..."
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                                                disabled={isSubmittingComment}
                                                className="w-full bg-gray-100 rounded-full pl-4 pr-10 py-2 text-[14px] outline-none focus:ring-1 focus:ring-pink-300 transition-shadow"
                                            />
                                            <button onClick={handleCommentSubmit} disabled={!commentText.trim() || isSubmittingComment} className="absolute right-1 text-pink-500 hover:bg-pink-50 p-1.5 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent">
                                                {isSubmittingComment ? <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-0.5"></div> : <Send size={18} className={commentText.trim() ? "fill-current" : ""} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Comments Section */}
                                    <div className="p-4 flex flex-col gap-2 bg-gray-50 flex-1">
                                        <h3 className="font-bold text-gray-800 text-[15px] mb-2">Bình luận</h3>
                                        {postDetail.comments && postDetail.comments.length > 0 ? (
                                            buildCommentTree(postDetail.comments).map(c => <CommentNode key={c.id} comment={c} onReply={handleReplyClick} onDelete={handleDeleteComment} currentUser={localUser} />)
                                        ) : (
                                            <div className="text-center text-sm text-gray-500 py-6">Chưa có bình luận nào. Hãy là người đầu tiên!</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center text-gray-500">Không thể tải thông tin bài viết.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}