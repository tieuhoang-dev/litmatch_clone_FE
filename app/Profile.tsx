"use client";

import React, { useState, useEffect } from 'react';
import { User, Cake, Info, BadgeCheck, Edit, PlusSquare, Image as ImageIcon, X, Camera } from 'lucide-react';
import { Post, PostCard, getImageUrl } from './PostFeed';
import CreatePostModal from './CreatePostModal';

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

    // State cho Modal Chỉnh sửa hồ sơ
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTab, setEditTab] = useState<'info' | 'password'>('info');
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editMessage, setEditMessage] = useState({ type: '', text: '' });
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

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

    // --- TẢI LẠI BÀI VIẾT KHI ĐĂNG THÀNH CÔNG ---
    const handlePostCreated = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
            const headers = { 'Authorization': `Bearer ${token}` };
            const postsRes = await fetch(`${apiUrl}/interact/post/me`, { headers });
            if (postsRes.ok) {
                const postData = await postsRes.json();
                setPosts(postData.posts || []);
            }
        } catch (err) {
            console.error('Lỗi khi tải lại bài viết:', err);
        }
    };

    // --- MỞ FORM CHỈNH SỬA ---
    const openEditModal = () => {
        setFullName(profile?.full_name || '');
        setBio(profile?.bio || '');
        setDob(profile?.date_of_birth ? profile.date_of_birth.substring(0, 10) : '');
        setGender(profile?.gender || 'nam');
        setAvatarFile(null);
        setAvatarPreview(null);
        setCurrentPassword('');
        setNewPassword('');
        setEditMessage({ type: '', text: '' });
        setEditTab('info');
        setIsEditOpen(true);
    };

    // --- LƯU THÔNG TIN CÁ NHÂN ---
    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setEditMessage({ type: '', text: '' });

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
            let avatarUrlToSave = profile?.avatar_url;

            // Gọi API upload nếu có đổi ảnh mới
            if (avatarFile) {
                const formData = new FormData();
                formData.append('file', avatarFile);
                formData.append('type', 'avatar');
                const uploadRes = await fetch(`${apiUrl}/interact/upload-media`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                console.log(avatarFile);
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    avatarUrlToSave = uploadData.url || uploadData.avatar_url || avatarUrlToSave;
                } else {
                    setEditMessage({ type: 'error', text: 'Lỗi tải ảnh lên.' });
                    setIsSubmitting(false);
                    return;
                }
            }

            // Cập nhật Profile
            const updateRes = await fetch(`${apiUrl}/user/profile`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    avatar_url: avatarUrlToSave,
                    gender: gender,
                    date_of_birth: dob,
                    bio: bio
                })
            });

            const data = await updateRes.json();
            if (updateRes.ok && data.status === 'success') {
                // Cập nhật dữ liệu hiển thị hiện tại ngay lập tức
                setProfile(prev => prev ? ({ ...prev, ...data.user, bio, date_of_birth: dob, gender }) : null);

                // Cập nhật dữ liệu LocalStorage để Header/Avatar Navbar ăn theo
                const storedUserStr = localStorage.getItem('currentUser');
                if (storedUserStr && data.user) {
                    try {
                        const storedUser = JSON.parse(storedUserStr);
                        storedUser.full_name = data.user.full_name;
                        storedUser.avatar_url = data.user.avatar_url;
                        localStorage.setItem('currentUser', JSON.stringify(storedUser));
                    } catch (e) { }
                }

                setEditMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
                setTimeout(() => setIsEditOpen(false), 1500); // Tự đóng sau 1.5s
            } else {
                setEditMessage({ type: 'error', text: data.message || 'Cập nhật thất bại.' });
            }
        } catch (err) {
            setEditMessage({ type: 'error', text: 'Lỗi kết nối đến máy chủ.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- ĐỔI MẬT KHẨU ---
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setEditMessage({ type: '', text: '' });

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/user/password`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setEditMessage({ type: 'success', text: data.message || 'Đổi mật khẩu thành công!' });
                setCurrentPassword('');
                setNewPassword('');
            } else {
                setEditMessage({ type: 'error', text: data.message || 'Đổi mật khẩu thất bại.' });
            }
        } catch (err) {
            setEditMessage({ type: 'error', text: 'Lỗi kết nối đến máy chủ.' });
        } finally {
            setIsSubmitting(false);
        }
    };

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
                                <button onClick={() => setIsCreatePostOpen(true)} className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-lg font-semibold transition-colors shadow-sm active:scale-95 text-sm">
                                    <PlusSquare size={18} /> Thêm bài đăng
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-shrink-0 mt-2 md:mt-0">
                        <button onClick={openEditModal} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-semibold transition-colors active:scale-95 text-sm">
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

            {/* MODAL CHỈNH SỬA THÔNG TIN */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-200 p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="font-bold text-lg text-gray-900">Cài đặt tài khoản</h2>
                            <button onClick={() => setIsEditOpen(false)} className="p-2 -mr-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                        </div>

                        <div className="flex border-b border-gray-100 px-4 pt-2 gap-4">
                            <button onClick={() => { setEditTab('info'); setEditMessage({ type: '', text: '' }); }} className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${editTab === 'info' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Thông tin cá nhân</button>
                            <button onClick={() => { setEditTab('password'); setEditMessage({ type: '', text: '' }); }} className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${editTab === 'password' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Đổi mật khẩu</button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                            {editMessage.text && (
                                <div className={`p-3 rounded-lg text-sm mb-4 font-medium animate-in fade-in border ${editMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-100'}`}>{editMessage.text}</div>
                            )}

                            {editTab === 'info' && (
                                <form onSubmit={handleUpdateInfo} className="flex flex-col gap-4">
                                    {/* Upload Avatar */}
                                    <div className="flex flex-col items-center gap-2 mb-2">
                                        <div className="relative group">
                                            <img src={avatarPreview || getImageUrl(profile?.avatar_url)} className="w-24 h-24 rounded-full object-cover shadow-sm ring-4 ring-pink-50" alt="avatar" />
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                <Camera size={24} className="text-white" />
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setAvatarFile(e.target.files[0]);
                                                        setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                        <span className="text-xs text-gray-500">Nhấn vào ảnh để thay đổi</span>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" required />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                                            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all bg-white">
                                                <option value="nam">Nam</option>
                                                <option value="nu">Nữ</option>
                                                <option value="khac">Khác</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                                            <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-gray-700" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiểu sử</label>
                                        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none" placeholder="Giới thiệu đôi nét về bản thân..."></textarea>
                                    </div>

                                    <div className="pt-3">
                                        <button type="submit" disabled={isSubmitting} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-pink-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed">
                                            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {editTab === 'password' && (
                                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" required placeholder="Nhập mật khẩu cũ..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" required placeholder="Nhập mật khẩu mới..." />
                                    </div>
                                    <div className="pt-3">
                                        <button type="submit" disabled={isSubmitting} className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed">
                                            {isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TẠO BÀI VIẾT */}
            <CreatePostModal
                isOpen={isCreatePostOpen}
                onClose={() => setIsCreatePostOpen(false)}
                currentUser={profile}
                token={token}
                onPostCreated={handlePostCreated}
            />
        </div>
    );
}