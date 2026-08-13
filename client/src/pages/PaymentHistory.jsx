import {
    Fragment,
    useEffect,
    useState
} from "react";

import "./PaymentHistory.css";


const PaymentHistory = () => {

    const token = localStorage.getItem("token");

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [
        expandedTransaction,
        setExpandedTransaction
    ] = useState(null);


    // ==========================================
    // FETCH PAYMENT HISTORY
    // ==========================================

    useEffect(() => {

        const fetchHistory = async () => {

            try {

                const response = await fetch(
                    "http://localhost:5000/api/payments/history",
                    {
                        method: "GET",

                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );


                const data =
                    await response.json();


                // ==================================
                // TOKEN INVALID / EXPIRED
                // ==================================

                if (
                    response.status === 401 ||
                    response.status === 403
                ) {

                    localStorage.removeItem("token");
                    localStorage.removeItem("user");

                    window.location.href = "/login";

                    return;
                }


                // ==================================
                // API ERROR
                // ==================================

                if (!response.ok) {

                    setError(
                        data.message ||
                        "Failed to fetch payment history"
                    );

                    return;
                }


                // ==================================
                // SAVE TRANSACTIONS
                // ==================================

                setTransactions(
                    data.transactions || []
                );


            } catch (error) {

                console.error(
                    "Payment history error:",
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
        // CHECK LOGIN
        // ==========================================

        if (!token) {

            window.location.href = "/login";

            return;
        }


        fetchHistory();


    }, [token]);


    // ==========================================
    // TOGGLE DETAILS
    // ==========================================

    const toggleDetails = (transactionId) => {

        if (
            expandedTransaction === transactionId
        ) {

            setExpandedTransaction(null);

        } else {

            setExpandedTransaction(
                transactionId
            );
        }
    };


    // ==========================================
    // FORMAT PAYMENT METHOD
    // ==========================================

    const formatPaymentMethod = (method) => {

        if (!method) {
            return "N/A";
        }


        return method
            .replaceAll("_", " ")
            .replace(
                /\b\w/g,
                (letter) =>
                    letter.toUpperCase()
            );
    };


    // ==========================================
    // FORMAT DATE
    // ==========================================

    const formatDate = (date) => {

        if (!date) {
            return "N/A";
        }


        return new Date(date)
            .toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );
    };


    // ==========================================
    // FORMAT DATE + TIME
    // ==========================================

    const formatDateTime = (date) => {

        if (!date) {
            return "N/A";
        }


        return new Date(date)
            .toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",

                    hour: "2-digit",
                    minute: "2-digit",

                    hour12: true
                }
            );
    };


    // ==========================================
    // FORMAT AMOUNT
    // ==========================================

    const formatAmount = (amount) => {

        const number =
            Number(amount);


        if (Number.isNaN(number)) {
            return amount;
        }


        return number.toFixed(2);
    };


    // ==========================================
    // UI
    // ==========================================

    return (

        <div className="history-page">

            <div className="history-container">


                {/* ==================================
                    BACK BUTTON
                ================================== */}

                <button
                    className="history-back-button"
                    type="button"

                    onClick={() => {
                        window.location.href =
                            "/dashboard";
                    }}
                >
                    ← Back to Dashboard
                </button>


                {/* ==================================
                    HEADER
                ================================== */}

                <div className="history-header">

                    <h1>
                        Payment History
                    </h1>

                    <p>
                        View all your previous transactions
                        and payment details.
                    </p>

                </div>


                {/* ==================================
                    HISTORY CARD
                ================================== */}

                <div className="history-card">


                    {/* ==================================
                        LOADING
                    ================================== */}

                    {loading ? (

                        <div className="history-state">

                            <h3>
                                Loading transactions...
                            </h3>

                            <p>
                                Please wait.
                            </p>

                        </div>


                    ) : error ? (


                        /* ==================================
                            ERROR
                        ================================== */

                        <div
                            className="
                                history-state
                                history-error
                            "
                        >

                            <h3>
                                Unable to load transactions
                            </h3>

                            <p>
                                {error}
                            </p>

                            <button
                                type="button"

                                onClick={() =>
                                    window.location.reload()
                                }
                            >
                                Retry
                            </button>

                        </div>


                    ) : transactions.length === 0 ? (


                        /* ==================================
                            EMPTY
                        ================================== */

                        <div className="history-state">

                            <h3>
                                No transactions found
                            </h3>

                            <p>
                                Your payment transactions
                                will appear here.
                            </p>

                        </div>


                    ) : (


                        /* ==================================
                            TRANSACTION TABLE
                        ================================== */

                        <div className="history-table-container">

                            <table className="history-table">


                                {/* ==========================
                                    TABLE HEADER
                                ========================== */}

                                <thead>

                                    <tr>

                                        <th>
                                            Amount
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

                                        <th>
                                            Details
                                        </th>

                                    </tr>

                                </thead>


                                {/* ==========================
                                    TABLE BODY
                                ========================== */}

                                <tbody>

                                    {transactions.map(
                                        (transaction) => (

                                            <Fragment
                                                key={
                                                    transaction.id
                                                }
                                            >


                                                {/* ==================
                                                    MAIN ROW
                                                ================== */}

                                                <tr>

                                                    <td
                                                        className="
                                                            history-amount
                                                        "
                                                    >
                                                        ₹
                                                        {
                                                            formatAmount(
                                                                transaction.amount
                                                            )
                                                        }
                                                    </td>


                                                    <td>

                                                        {
                                                            formatPaymentMethod(
                                                                transaction
                                                                    .payment_method
                                                            )
                                                        }

                                                    </td>


                                                    <td>

                                                        <span
                                                            className={
                                                                `history-status ${
                                                                    transaction
                                                                        .status
                                                                        ?.toLowerCase() ||
                                                                    "pending"
                                                                }`
                                                            }
                                                        >

                                                            {
                                                                transaction
                                                                    .status ||
                                                                "PENDING"
                                                            }

                                                        </span>

                                                    </td>


                                                    <td
                                                        className="
                                                            history-reference
                                                        "
                                                    >

                                                        {
                                                            transaction
                                                                .transaction_reference
                                                        }

                                                    </td>


                                                    <td>

                                                        {
                                                            formatDate(
                                                                transaction
                                                                    .created_at
                                                            )
                                                        }

                                                    </td>


                                                    <td>

                                                        <button
                                                            type="button"

                                                            className="
                                                                details-button
                                                            "

                                                            onClick={() =>
                                                                toggleDetails(
                                                                    transaction.id
                                                                )
                                                            }
                                                        >

                                                            {
                                                                expandedTransaction ===
                                                                transaction.id
                                                                    ? "Hide Details"
                                                                    : "View Details"
                                                            }

                                                        </button>

                                                    </td>

                                                </tr>


                                                {/* ==================
                                                    EXPANDED DETAILS
                                                ================== */}

                                                {expandedTransaction ===
                                                    transaction.id && (

                                                    <tr
                                                        className="
                                                            transaction-details-row
                                                        "
                                                    >

                                                        <td colSpan={6}>

                                                            <div
                                                                className="
                                                                    transaction-details
                                                                "
                                                            >


                                                                {/* AMOUNT */}

                                                                <div
                                                                    className="
                                                                        detail-item
                                                                    "
                                                                >

                                                                    <span
                                                                        className="
                                                                            detail-label
                                                                        "
                                                                    >
                                                                        Amount
                                                                    </span>

                                                                    <span
                                                                        className="
                                                                            detail-value
                                                                        "
                                                                    >
                                                                        ₹
                                                                        {
                                                                            formatAmount(
                                                                                transaction.amount
                                                                            )
                                                                        }
                                                                        {" "}
                                                                        {
                                                                            transaction.currency
                                                                        }
                                                                    </span>

                                                                </div>


                                                                {/* STATUS */}

                                                                <div
                                                                    className="
                                                                        detail-item
                                                                    "
                                                                >

                                                                    <span
                                                                        className="
                                                                            detail-label
                                                                        "
                                                                    >
                                                                        Status
                                                                    </span>

                                                                    <span
                                                                        className="
                                                                            detail-value
                                                                        "
                                                                    >
                                                                        {
                                                                            transaction.status
                                                                        }
                                                                    </span>

                                                                </div>


                                                                {/* PAYMENT METHOD */}

                                                                <div
                                                                    className="
                                                                        detail-item
                                                                    "
                                                                >

                                                                    <span
                                                                        className="
                                                                            detail-label
                                                                        "
                                                                    >
                                                                        Payment Method
                                                                    </span>

                                                                    <span
                                                                        className="
                                                                            detail-value
                                                                        "
                                                                    >
                                                                        {
                                                                            formatPaymentMethod(
                                                                                transaction
                                                                                    .payment_method
                                                                            )
                                                                        }
                                                                    </span>

                                                                </div>


                                                                {/* CURRENCY */}

                                                                <div
                                                                    className="
                                                                        detail-item
                                                                    "
                                                                >

                                                                    <span
                                                                        className="
                                                                            detail-label
                                                                        "
                                                                    >
                                                                        Currency
                                                                    </span>

                                                                    <span
                                                                        className="
                                                                            detail-value
                                                                        "
                                                                    >
                                                                        {
                                                                            transaction.currency
                                                                        }
                                                                    </span>

                                                                </div>


                                                                {/* TRANSACTION REFERENCE */}

                                                                <div
                                                                    className="
                                                                        detail-item
                                                                    "
                                                                >

                                                                    <span
                                                                        className="
                                                                            detail-label
                                                                        "
                                                                    >
                                                                        Transaction Reference
                                                                    </span>

                                                                    <span
                                                                        className="
                                                                            detail-value
                                                                        "
                                                                    >
                                                                        {
                                                                            transaction
                                                                                .transaction_reference
                                                                        }
                                                                    </span>

                                                                </div>


                                                                {/* RAZORPAY ORDER ID */}

                                                                <div
                                                                    className="
                                                                        detail-item
                                                                    "
                                                                >

                                                                    <span
                                                                        className="
                                                                            detail-label
                                                                        "
                                                                    >
                                                                        Razorpay Order ID
                                                                    </span>

                                                                    <span
                                                                        className="
                                                                            detail-value
                                                                        "
                                                                    >
                                                                        {
                                                                            transaction
                                                                                .razorpay_order_id ||
                                                                            "Not available"
                                                                        }
                                                                    </span>

                                                                </div>


                                                                {/* RAZORPAY PAYMENT ID */}

                                                                <div
                                                                    className="
                                                                        detail-item
                                                                    "
                                                                >

                                                                    <span
                                                                        className="
                                                                            detail-label
                                                                        "
                                                                    >
                                                                        Razorpay Payment ID
                                                                    </span>

                                                                    <span
                                                                        className="
                                                                            detail-value
                                                                        "
                                                                    >
                                                                        {
                                                                            transaction
                                                                                .razorpay_payment_id ||
                                                                            "Not available"
                                                                        }
                                                                    </span>

                                                                </div>


                                                                {/* DATE & TIME */}

                                                                <div
                                                                    className="
                                                                        detail-item
                                                                    "
                                                                >

                                                                    <span
                                                                        className="
                                                                            detail-label
                                                                        "
                                                                    >
                                                                        Date & Time
                                                                    </span>

                                                                    <span
                                                                        className="
                                                                            detail-value
                                                                        "
                                                                    >
                                                                        {
                                                                            formatDateTime(
                                                                                transaction
                                                                                    .created_at
                                                                            )
                                                                        }
                                                                    </span>

                                                                </div>


                                                                {/* FAILURE REASON */}

                                                                {transaction.status ===
                                                                    "FAILED" && (

                                                                    <div
                                                                        className="
                                                                            detail-item
                                                                            failure-detail
                                                                        "
                                                                    >

                                                                        <span
                                                                            className="
                                                                                detail-label
                                                                            "
                                                                        >
                                                                            Failure Reason
                                                                        </span>

                                                                        <span
                                                                            className="
                                                                                detail-value
                                                                                failure-reason
                                                                            "
                                                                        >
                                                                            {
                                                                                transaction
                                                                                    .failure_reason ||
                                                                                "Payment failed"
                                                                            }
                                                                        </span>

                                                                    </div>

                                                                )}

                                                            </div>

                                                        </td>

                                                    </tr>

                                                )}

                                            </Fragment>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
};


export default PaymentHistory;