import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;

export const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      handleOAuthCallback(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleOAuthCallback = async (code: string) => {
    try {
      const params = new URLSearchParams({ code });
      const response = await fetch(`/api/auth/discord?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Authentication failed");
      }

      const { token } = await response.json();
      login(token);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed, check console for details");
    }
  };

  const handleLogin = () => {
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "identify guilds.members.read",
    });

    window.location.href = `https://discord.com/api/oauth2/authorize?${params}`;
  };

  return (
    <div className="login-container">
      <h1>Discord Role Manager</h1>
      <p>Please log in with Discord to manage roles</p>
      <button onClick={handleLogin} className="discord-login-button">
        Login with Discord
      </button>
      <style>{`
        .login-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
          background-color: #f5f5f5;
        }

        .discord-login-button {
          background-color: #7289DA;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .discord-login-button:hover {
          background-color: #5b6eae;
        }
      `}</style>
    </div>
  );
};
