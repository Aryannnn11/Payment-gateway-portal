import { useState } from "react";
import { Link } from "react-router-dom";
import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/users/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                setMessage(data.message || "Login failed");
                return;
            }
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "/dashboard";
        } catch (error) {
            console.error("Login error:", error);
            setMessage("Unable to connect to the server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-card">
                <h1 className="auth-brand">Payment Gateway Portal</h1>
                <h2>Welcome back</h2>
                <form onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="login-email">Email address</label>
                        <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="login-password">Password</label>
                        <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                    </div>
                    {message && <p className="auth-error" role="alert">{message}</p>}
                    <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
                </form>
                <p className="auth-footer">New here? <Link to="/register">Create an account</Link></p>
            </section>
        </main>
    );
}

export default Login;
