import axios from "axios";

const getBaseURL = () => {
    if (import.meta.env.MODE !== "development") {
        return "https://chatzone-backend-c0mn.onrender.com/api";
    }
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `http://${hostname}:5001/api`;
};

export const axiosInstance = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,
})