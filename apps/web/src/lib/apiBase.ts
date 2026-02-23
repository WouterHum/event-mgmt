export const getBaseURL = () => {
  // Use env variable first if defined
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1")
      return "http://localhost:8000";

    // LAN access: backend assumed to run on port 8000
    return `http://${hostname}:8000`;
  }

  // Fallback for SSR or unknown
  return "http://localhost:8000";
};
