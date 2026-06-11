import { io } from "socket.io-client";

// Initialize Socket.io without a URL, which defaults to window.location.origin.
// - In production: This connects directly to the Express server (on the dynamically selected port).
// - In development: This connects to the Vite dev server (port 5173), which proxies to the Express server.
export const socket = io({
    autoConnect: false
});

