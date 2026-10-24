import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
        <div>
            <h1>Payment Gateway Portal</h1>
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="register-name">Name</label>
                    <input id="register-name" type="text" required value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div>
                    <label htmlFor="register-email">Email</label>
                    <input id="register-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div>
                    <label htmlFor="register-password">Password</label>
                    <input id="register-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
                {message && <p role="alert">{message}</p>}
                <button type="submit" disabled={loading}>{loading ? "Creating account..." : "Register"}</button>
            </form>
            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
}

export default Register;
