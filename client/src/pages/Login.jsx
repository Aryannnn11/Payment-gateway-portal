const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

import { useState } from "react";
import { Link } from "react-router-dom";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");

        try {
            const response = await fetch(
                `${API_URL}/api/users/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Login failed");
                return;
            }

         if (response.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            window.location.href = "/dashboard";
            }

        } catch (error) {
            console.error("Login error:", error);
            setMessage("Unable to connect to the server");
        }
    };

    return (
        <div>
            <h1>Payment Gateway Portal</h1>

            <h2>Login</h2>

            <form onSubmit={handleSubmit}>

                <div>
                    <label>Email</label>

                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </div>

                <div>
                    <label>Password</label>

                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>

                <button type="submit">
                    Login
                </button>

                {message && <p role="alert">{message}</p>}
            </form>
            <p>New here? <Link to="/register">Create an account</Link></p>
        </div>
    );
}

export default Login;