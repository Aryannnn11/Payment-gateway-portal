import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Register() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/users/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                setMessage(data.message || "Registration failed");
                return;
            }
            navigate("/login");
        } catch (error) {
            console.error("Registration error:", error);
            setMessage("Unable to connect to the server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-card">
                <h1 className="auth-brand">Payment Gateway Portal</h1>
                <h2>Create account</h2>
                <form onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="register-name">Full name</label>
                        <input id="register-name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="register-email">Email address</label>
                        <input id="register-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="register-password">Password</label>
                        <input id="register-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
                    </div>
                    {message && <p className="auth-error" role="alert">{message}</p>}
                    <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Creating account..." : "Register"}</button>
                </form>
                <p className="auth-footer">Already have an account? <Link to="/login">Login</Link></p>
            </section>
        </main>
    );
}

export default Register;
