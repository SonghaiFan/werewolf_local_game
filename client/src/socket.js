import { io } from "socket.io-client";

// For local development, assume server is on same host port 3000
// When accessing from another device, window.location.hostname will be the host's IP
const URL = `http://${window.location.hostname}:3000`;

export const socket = io(URL, {
    autoConnect: false
});
