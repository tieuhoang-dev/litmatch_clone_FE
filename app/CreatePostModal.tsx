"use client";

import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getImageUrl } from './PostFeed';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
    token: string;
    onPostCreated?: () => void;
}

export default function CreatePostModal({ isOpen, onClose, currentUser, token, onPostCreated }: CreatePostModalProps) {
    const [content, setContent] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!content.trim() && !mediaFile) return;
        setIsSubmitting(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
            let mediaData: { url: string; type: string } | null = null;

            // 1. Nếu có media (ảnh/video), gọi API upload trước
            if (mediaFile) {
                const formData = new FormData();
                formData.append('file', mediaFile);
                formData.append('type', 'post');

                const uploadRes = await fetch(`${apiUrl}/interact/upload-media`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    console.log('Upload BE Response:', uploadData);
                    const fileUrl = uploadData.url || uploadData.avatar_url;
                    if (fileUrl) {
                        mediaData = {
                            url: fileUrl,
                            type: mediaFile.type.startsWith('video') ? 'video' : 'image'
                        };
                    }
                } else {
                    const errData = await uploadRes.text();
                    console.error('Lỗi tải file lên. BE Response:', errData);
                    setIsSubmitting(false);
                    return;
                }
            }

            // 2. Gọi API đăng bài viết
            const payload: any = { content: content.trim() };
            if (mediaData) {
                payload.postMedia = [mediaData];
            }
            console.log('Payload gửi lên API Post:', payload);
            const postRes = await fetch(`${apiUrl}/interact/post`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            let postData;
            try {
                postData = await postRes.json();
            } catch (e) {
                postData = await postRes.text(); // Đề phòng BE trả về string lỗi thay vì JSON
            }
            console.log('Post BE Response:', postRes.status, postData);

            if (postRes.ok) {
                setContent('');
                setMediaFile(null);
                setMediaPreview(null);
                if (onPostCreated) onPostCreated();
                onClose();
            } else {
                console.error('Lỗi đăng bài:', postData);
            }
        } catch (error) {
            console.error('Exception khi đăng bài:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg flex flex-col animate-in slide-in-from-bottom-full duration-300 sm:rounded-2xl sm:shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sm:rounded-t-2xl shrink-0">
                    <button onClick={onClose} disabled={isSubmitting} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50">
                        <X size={26} className="text-gray-600" />
                    </button>
                    <h2 className="font-bold text-lg text-gray-800">Tạo bài viết</h2>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (!content.trim() && !mediaFile)}
                        className="font-bold text-white bg-pink-500 hover:bg-pink-600 px-6 py-2 rounded-full transition-colors active:scale-95 text-[15px] shadow-sm shadow-pink-200 disabled:opacity-60 flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Đăng'}
                    </button>
                </div>
                <div className="p-4 flex items-center gap-3 bg-white shrink-0">
                    <img src={getImageUrl(currentUser?.avatar_url)} className="w-12 h-12 rounded-full object-cover shadow-sm ring-1 ring-gray-100" alt="User" />
                    <div>
                        <div className="font-bold text-[16px] text-gray-900">{currentUser?.username || "Bạn"}</div>
                        <div className="text-[12px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium inline-block mt-0.5">🌍 Công khai</div>
                    </div>
                </div>
                <div className="px-4 flex-1 bg-white overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[200px]">
                    <textarea autoFocus value={content} onChange={(e) => setContent(e.target.value)} placeholder={`${currentUser?.username || "Bạn"} ơi, bạn đang nghĩ gì?`} className="w-full text-[17px] outline-none resize-none placeholder:text-gray-400 text-gray-800 leading-relaxed min-h-[100px]" />
                    {mediaPreview && (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm mt-2 shrink-0">
                            <button onClick={handleRemoveMedia} className="absolute top-2 right-2 bg-gray-900/60 text-white p-1.5 rounded-full hover:bg-gray-900 transition-colors z-10"><X size={18} /></button>
                            {mediaFile?.type.startsWith('video') ? (<video src={mediaPreview} controls className="w-full max-h-[300px] object-contain bg-gray-50" />) : (<img src={mediaPreview} className="w-full max-h-[300px] object-contain bg-gray-50" alt="Preview" />)}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-white sm:rounded-b-2xl shrink-0">
                    <div onClick={() => fileInputRef.current?.click()} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                        <span className="font-medium text-gray-700">Thêm vào bài viết của bạn</span>
                        <div className="flex gap-2"><button className="text-green-500 p-1.5 hover:bg-green-50 rounded-full transition-colors pointer-events-none"><ImageIcon size={24} /></button><input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} /></div>
                    </div>
                </div>
            </div>
        </div>
    );
}