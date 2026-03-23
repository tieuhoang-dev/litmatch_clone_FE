"use client";


interface ICECandidate {
    candidate: string;
    sdpMid?: string;
    sdpMLineIndex?: number;
}

// Cấu trúc tin nhắn chính để gửi và nhận qua WebSocket
export interface WSMessage {
    type: string;
    from?: string;
    to?: string;
    content?: string;
    message_ids?: string[];
    with?: string;
    with_many?: string[];
    status?: string;
    page?: number;
    page_size?: number;
    tempId?: string;
    id?: string;
    looking_for?: string;
    offer?: any;
    answer?: any;
    candidate?: ICECandidate;
    reason?: string;
    // Các trường có thể có trong tin nhắn nhận về
    messages?: any[];
    contacts?: any[];
    notifications?: any[];
    username?: string;
    avatar?: string;
    timestamp?: string;
    call_type?: 'voice' | 'video';
    message_id?: string;
    duration?: number;
    session_id?: string;
}

type EventCallback = (data: any) => void;

class WebSocketService {
    private socket: WebSocket | null = null;
    private listeners: Map<string, EventCallback[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectInterval = 5000;

    public connect(token: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log("WebSocket is already connected.");
            return;
        }

        const wsUrl = (process.env.NEXT_PUBLIC_API_BASE_URL + "/interact/ws" || 'http://localhost:8000/api')
            .replace(/^http/, 'ws')
            .replace('/api', '/ws');

        this.socket = new WebSocket(`${wsUrl}?token=${token}`);

        this.socket.onopen = () => {
            console.log("🟢 WebSocket connected successfully.");
            this.reconnectAttempts = 0;
            this.sendMessage({ type: 'set_online' });
            this.emit('open', {});
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("RECV:", data);
                this.emit(data.type, data);
            } catch (error) {
                console.error("🔴 Error parsing incoming message:", error);
            }
        };

        this.socket.onerror = (error) => {
            console.error("🔴 WebSocket error:", error);
            this.emit('error', error);
        };

        this.socket.onclose = (event) => {
            console.log(`⚫ WebSocket disconnected: ${event.code} ${event.reason}`);
            this.socket = null;
            this.emit('close', event);

            if (event.code === 1000 || event.code === 4001) return;

            this.handleReconnect(token);
        };
    }

    private handleReconnect(token: string): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect in ${this.reconnectInterval / 1000}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(token), this.reconnectInterval);
        } else {
            console.error("🔴 Max reconnection attempts reached. Giving up.");
        }
    }

    public sendMessage(message: Partial<WSMessage>): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log("SEND:", message);
            this.socket.send(JSON.stringify(message));
        } else {
            console.error("🔴 WebSocket is not connected. Cannot send message.");
        }
    }

    public on(eventName: string, callback: EventCallback): void {
        if (!this.listeners.has(eventName)) this.listeners.set(eventName, []);
        this.listeners.get(eventName)?.push(callback);
    }

    public off(eventName: string, callback: EventCallback): void {
        const cbs = this.listeners.get(eventName);
        if (cbs) this.listeners.set(eventName, cbs.filter((cb) => cb !== callback));
    }

    private emit(eventName: string, data: any): void {
        this.listeners.get(eventName)?.forEach((callback) => callback(data));
    }

    public disconnect(): void {
        if (this.socket) {
            this.reconnectAttempts = this.maxReconnectAttempts;
            this.sendMessage({ type: 'set_offline' });
            this.socket.close(1000, "User disconnected");
        }
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;
