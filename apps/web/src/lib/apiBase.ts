export const getBaseURL = () => {
  // 1️⃣ If explicitly defined at build time, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2️⃣ If in browser, detect current hostname
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    // Local dev
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }

    // LAN / deployed on same host
    return `${protocol}//${hostname}:8000`;
  }

  // 3️⃣ Fallback (SSR)
  return "http://localhost:8000";
};
