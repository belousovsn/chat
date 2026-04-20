import { io } from "socket.io-client";
let socket = null;
export const getSocket = () => {
    if (!socket) {
        socket = io({
            withCredentials: true
        });
    }
    return socket;
};
//# sourceMappingURL=socket.js.map