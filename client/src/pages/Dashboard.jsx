import { useEffect, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";
import "./Dashboard.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Dashboard = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ==========================================
    // LOGOUT
    // ==========================================

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/login";
    };

    // ==========================================
    // FETCH DASHBOARD
    // ==========================================

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    "http://localhost:5000/api/dashboard",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                // ==========================================
                // INVALID / EXPIRED TOKEN
                // ==========================================

                if (
                    response.status === 401 ||
                    response.status === 403
                ) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");

                    window.location.href = "/login";

                    return;
                }

                // ==========================================
                // OTHER API ERRORS
                // ==========================================

                if (!response.ok) {
                    setError(
                        data.message ||
                        "Failed to load dashboard"
                    );

                    return;
                }

                // ==========================================
                // SUCCESS
                // ==========================================

                setDashboardData(data);

            } catch (error) {
                console.error(
                    "Dashboard error:",
                    error
                );

                setError(
                    "Unable to connect to the server"
                );

            } finally {
                setLoading(false);
            }
        };

        // ==========================================
        // NO TOKEN
        // ==========================================

        if (!token) {
            localStorage.removeItem("user");

            window.location.href = "/login";

            return;
        }

        fetchDashboard();

    }, [token]);


    // ==========================================
    // CHART DATA
    // ==========================================

    const chartData = {
        labels:
            dashboardData?.monthly_payments?.map(
                (payment) => payment.month
            ) || [],

        datasets: [
            {
                label: "Monthly Spending",

                data:
                    dashboardData?.monthly_payments?.map(
                        (payment) =>
                            Number(payment.total_amount)
                    ) || [],

                borderWidth: 1
            }
        ]
    };


    const chartOptions = {
        responsive: true,

        plugins: {
            legend: {
                display: true
            },

            title: {
                display: true,
                text: "Monthly Payment Analytics"
            }
        }
    };


    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="dashboard">

            {/* NAVBAR */}

            <nav className="navbar">

                <h2>
                    Payment Gateway
                </h2>

                <div className="navbar-actions">

                    <button
                        className="payment-btn"
                        onClick={() => {
                            window.location.href = "/payment";
                        }}
                    >
                        Make Payment
                    </button>
                    <button 
                        className="history-btn"
                        onClick={() => {
                            window.location.href = "/history";
                        }}
                    >
                        Payment History
                    </button>    

                    <button className="logout-btn"
                            onClick={logout}>
                        Logout
                    </button>

                </div>

            </nav>


            {/* MAIN */}

            <main className="dashboard-content">

                {/* ==========================================
                    LOADING
                ========================================== */}

                {loading ? (

                    <div className="dashboard-loading">

                        <h2>
                            Loading dashboard...
                        </h2>

                        <p>
                            Please wait.
                        </p>

                    </div>

                ) : error ? (

                    /* ==========================================
                       ERROR
                    ========================================== */

                    <div className="dashboard-error">

                        <h2>
                            Something went wrong
                        </h2>

                        <p>
                            {error}
                        </p>

                        <button
                            onClick={() =>
                                window.location.reload()
                            }
                        >
                            Retry
                        </button>

                    </div>

                ) : (

                    /* ==========================================
                       DASHBOARD
                    ========================================== */

                    <>

                        {/* WELCOME */}

                        <section className="welcome-section">

                            <h1>
                                Welcome, {user?.name} 👋
                            </h1>

                            <p>
                                {user?.email}
                            </p>

                        </section>


                        {/* STATISTICS */}

                        <section className="stats">

                            <div className="stat-card">

                                <h3>
                                    Total Amount
                                </h3>

                                <p>
                                    ₹
                                    {dashboardData?.total_amount ||
                                        0}
                                </p>

                            </div>


                            <div className="stat-card">

                                <h3>
                                    Total Transactions
                                </h3>

                                <p>
                                    {dashboardData?.total_transactions ||
                                        0}
                                </p>

                            </div>


                            <div className="stat-card">

                                <h3>
                                    Successful Payments
                                </h3>

                                <p>
                                    {dashboardData?.successful_transactions ||
                                        0}
                                </p>

                            </div>


                            <div className="stat-card">

                                <h3>
                                    Failed Payments
                                </h3>

                                <p>
                                    {dashboardData?.failed_transactions ||
                                        0}
                                </p>

                            </div>

                        </section>


                        {/* PAYMENT ANALYTICS */}

                        <section className="analytics-section">

                            <h2>
                                Payment Analytics
                            </h2>

                            {dashboardData?.monthly_payments
                                ?.length === 0 ? (

                                <p>
                                    No payment data available.
                                </p>

                            ) : (

                                <div className="chart-container">

                                    <Bar
                                        data={chartData}
                                        options={chartOptions}
                                    />

                                </div>

                            )}

                        </section>


                        {/* RECENT TRANSACTIONS */}

                        <section className="payments-section">

                            <h2>
                                Recent Transactions
                            </h2>


                            {dashboardData?.recent_transactions
                                ?.length === 0 ? (

                                <p>
                                    No payments found.
                                </p>

                            ) : (

                                <div className="table-container">

                                    <table>

                                        <thead>

                                            <tr>

                                                <th>
                                                    Amount
                                                </th>

                                                <th>
                                                    Currency
                                                </th>

                                                <th>
                                                    Method
                                                </th>

                                                <th>
                                                    Status
                                                </th>

                                                <th>
                                                    Transaction Reference
                                                </th>

                                                <th>
                                                    Date
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {dashboardData?.recent_transactions?.map(
                                                (transaction) => (

                                                    <tr
                                                        key={
                                                            transaction.id
                                                        }
                                                    >

                                                        <td>
                                                            ₹
                                                            {
                                                                transaction.amount
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                transaction.currency
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                transaction.payment_method
                                                            }
                                                        </td>

                                                        <td>

                                                            <span
                                                                className={`status ${transaction.status.toLowerCase()}`}
                                                            >
                                                                {
                                                                    transaction.status
                                                                }
                                                            </span>

                                                        </td>

                                                        <td>
                                                            {
                                                                transaction.transaction_reference
                                                            }
                                                        </td>

                                                        <td>

                                                            {new Date(
                                                                transaction.created_at
                                                            ).toLocaleDateString()}

                                                        </td>

                                                    </tr>

                                                )
                                            )}

                                        </tbody>

                                    </table>

                                </div>

                            )}

                        </section>

                    </>

                )}

            </main>

        </div>
    );
};

export default Dashboard;