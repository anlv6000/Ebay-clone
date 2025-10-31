// Get the base URL from environment variables or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:9999";
const BACKEND_API_URI = `${API_BASE_URL}/api`;

export {
    API_BASE_URL,
    BACKEND_API_URI
}