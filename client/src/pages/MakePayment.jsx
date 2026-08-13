import { useState } from "react";
import "./MakePayment.css";

const MakePayment = () => {
    const [amount, setAmount] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);


    // ==========================================
    // LOAD RAZORPAY SCRIPT
    // ==========================================

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {

            if (window.Razorpay) {
                resolve(true);
                return;
            }

            const script = document.createElement("script");

            script.src =
                "https://checkout.razorpay.com/v1/checkout.js";

            script.onload = () => {
                resolve(true);
            };

            script.onerror = () => {
                resolve(false);
            };

            document.body.appendChild(script);
        });
    };


    // ==========================================
    // HANDLE PAYMENT
    // ==========================================

    const handlePayment = async (event) => {
        event.preventDefault();

        setMessage("");
        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            // ------------------------------------------
            // CHECK LOGIN
            // ------------------------------------------

            if (!token) {
                window.location.href = "/login";
                return;
            }


            // ------------------------------------------
            // 1. LOAD RAZORPAY CHECKOUT
            // ------------------------------------------

            const razorpayLoaded =
                await loadRazorpayScript();

            if (!razorpayLoaded) {
                setMessage(
                    "Unable to load Razorpay. Please try again."
                );

                return;
            }


            // ------------------------------------------
            // 2. CREATE RAZORPAY ORDER
            // ------------------------------------------

            const orderResponse = await fetch(
                "http://localhost:5000/api/payments/create-order",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        amount: Number(amount)
                    })
                }
            );


            const orderData =
                await orderResponse.json();


            // ------------------------------------------
            // INVALID / EXPIRED TOKEN
            // ------------------------------------------

            if (
                orderResponse.status === 401 ||
                orderResponse.status === 403
            ) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                window.location.href = "/login";

                return;
            }


            // ------------------------------------------
            // ORDER CREATION FAILED
            // ------------------------------------------

            if (!orderResponse.ok) {
                setMessage(
                    orderData.message ||
                    "Failed to create payment order"
                );

                return;
            }


            // ------------------------------------------
            // 3. RAZORPAY OPTIONS
            // ------------------------------------------

            const options = {
                key:
                    import.meta.env.VITE_RAZORPAY_KEY_ID,

                amount:
                    orderData.order.amount,

                currency:
                    orderData.order.currency,

                name:
                    "Payment Gateway",

                description:
                    "Payment Transaction",

                order_id:
                    orderData.order.id,


                // ======================================
                // SUCCESS HANDLER
                // ======================================

                handler: async function (response) {
                    try {
                        const verifyResponse = await fetch(
                            "http://localhost:5000/api/payments/verify-payment",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    Authorization:
                                        `Bearer ${token}`
                                },

                                body: JSON.stringify({
                                    razorpay_order_id:
                                        response.razorpay_order_id,

                                    razorpay_payment_id:
                                        response.razorpay_payment_id,

                                    razorpay_signature:
                                        response.razorpay_signature
                                })
                            }
                        );


                        const verifyData =
                            await verifyResponse.json();


                        // ------------------------------
                        // TOKEN EXPIRED
                        // ------------------------------

                        if (
                            verifyResponse.status === 401 ||
                            verifyResponse.status === 403
                        ) {
                            localStorage.removeItem("token");
                            localStorage.removeItem("user");

                            window.location.href = "/login";

                            return;
                        }


                        // ------------------------------
                        // PAYMENT VERIFIED
                        // ------------------------------

                        if (verifyResponse.ok) {
                            setMessage(
                                `Payment successful! Transaction: ${verifyData.transaction.transaction_reference}`
                            );

                            setAmount("");

                        } else {
                            setMessage(
                                verifyData.message ||
                                "Payment verification failed"
                            );
                        }

                    } catch (error) {
                        console.error(
                            "Payment verification error:",
                            error
                        );

                        setMessage(
                            "Payment verification failed"
                        );
                    }
                },


                // ======================================
                // USER INFORMATION
                // ======================================

                prefill: {
                    name:
                        JSON.parse(
                            localStorage.getItem("user")
                        )?.name || "",

                    email:
                        JSON.parse(
                            localStorage.getItem("user")
                        )?.email || ""
                },


                // ======================================
                // CHECKOUT THEME
                // ======================================

                theme: {
                    color: "#111827"
                }
            };


            // ------------------------------------------
            // 4. CREATE RAZORPAY INSTANCE
            // ------------------------------------------

            const razorpay =
                new window.Razorpay(options);


            // ==========================================
            // PAYMENT FAILURE
            // ==========================================

            razorpay.on(
                "payment.failed",

                async function (response) {
                    console.error(
                        "Razorpay payment failed:",
                        response.error
                    );

                    try {
                        const failureResponse = await fetch(
                            "http://localhost:5000/api/payments/record-failure",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    Authorization:
                                        `Bearer ${token}`
                                },

                                body: JSON.stringify({
                                    razorpay_order_id:
                                        response.error
                                            ?.metadata
                                            ?.order_id ||
                                        orderData.order.id,

                                    razorpay_payment_id:
                                        response.error
                                            ?.metadata
                                            ?.payment_id ||
                                        null,
                                    failure_reason:
                                        response.error?.description ||
                                        response.error?.reason ||
                                        "Payment failed"
                                    
                                        
                                })
                            }
                        );


                        const failureData =
                            await failureResponse.json();


                        // ------------------------------
                        // TOKEN EXPIRED
                        // ------------------------------

                        if (
                            failureResponse.status === 401 ||
                            failureResponse.status === 403
                        ) {
                            localStorage.removeItem("token");
                            localStorage.removeItem("user");

                            window.location.href = "/login";

                            return;
                        }


                        // ------------------------------
                        // RECORDING FAILURE ERROR
                        // ------------------------------

                        if (!failureResponse.ok) {
                            console.error(
                                "Could not record failed payment:",
                                failureData.message
                            );
                        }

                    } catch (error) {
                        console.error(
                            "Failed payment recording error:",
                            error
                        );
                    }


                    // ----------------------------------
                    // SHOW FAILURE MESSAGE
                    // ----------------------------------

                    setMessage(
                        response.error?.description ||
                        "Payment failed"
                    );
                }
            );


            // ------------------------------------------
            // 5. OPEN RAZORPAY CHECKOUT
            // ------------------------------------------

            razorpay.open();


        } catch (error) {
            console.error(
                "Payment error:",
                error
            );

            setMessage(
                "Something went wrong. Please try again."
            );

        } finally {
            setLoading(false);
        }
    };


    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="payment-page">

            <div className="payment-card">


                {/* BACK BUTTON */}

                <button
                    className="back-button"
                    type="button"
                    onClick={() => {
                        window.location.href =
                            "/dashboard";
                    }}
                >
                    ← Back to Dashboard
                </button>


                {/* HEADER */}

                <div className="payment-header">

                    <h1>
                        Make Payment
                    </h1>

                    <p>
                        Complete your payment securely.
                    </p>

                </div>


                {/* PAYMENT FORM */}

                <form onSubmit={handlePayment}>


                    {/* AMOUNT */}

                    <div className="form-group">

                        <label htmlFor="amount">
                            Amount
                        </label>

                        <input
                            id="amount"
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(event) =>
                                setAmount(
                                    event.target.value
                                )
                            }
                            min="1"
                            required
                        />

                    </div>


                    {/* PAY BUTTON */}

                    <button
                        className="pay-button"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Processing..."
                            : "Pay with Razorpay"}
                    </button>

                </form>


                {/* MESSAGE */}

                {message && (
                    <p className="payment-message">
                        {message}
                    </p>
                )}

            </div>

        </div>
    );
};

export default MakePayment;