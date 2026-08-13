const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const authenticateToken = require("../middleware/auth");
const razorpay = require("../config/razorpay");

const router = express.Router();


// ==========================================
// CREATE RAZORPAY ORDER
// ==========================================

router.post("/create-order", authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                message: "Valid amount is required"
            });
        }

        const amountInPaise =
            Math.round(Number(amount) * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,

            notes: {
                user_id: String(req.user.id)
            }
        };

        const order =
            await razorpay.orders.create(options);

        res.status(201).json({
            message:
                "Razorpay order created successfully",

            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency
            }
        });

    } catch (error) {
        console.error(
            "Razorpay order error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to create Razorpay order"
        });
    }
});


// ==========================================
// VERIFY SUCCESSFUL RAZORPAY PAYMENT
// ==========================================

router.post(
    "/verify-payment",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            } = req.body;


            // ======================================
            // 1. VALIDATE REQUIRED DATA
            // ======================================

            if (
                !razorpay_order_id ||
                !razorpay_payment_id ||
                !razorpay_signature
            ) {
                return res.status(400).json({
                    message:
                        "Payment verification details are required"
                });
            }


            // ======================================
            // 2. FETCH RAZORPAY ORDER
            // ======================================

            const order =
                await razorpay.orders.fetch(
                    razorpay_order_id
                );


            // ======================================
            // 3. VERIFY ORDER OWNERSHIP
            // ======================================

            if (
                String(order.notes?.user_id) !==
                String(req.user.id)
            ) {
                return res.status(403).json({
                    message:
                        "You are not authorized to verify this payment"
                });
            }


            // ======================================
            // 4. GENERATE EXPECTED SIGNATURE
            // ======================================

            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        process.env.RAZORPAY_KEY_SECRET
                    )
                    .update(
                        `${razorpay_order_id}|${razorpay_payment_id}`
                    )
                    .digest("hex");


            // ======================================
            // 5. VERIFY SIGNATURE
            // ======================================

            if (
                generatedSignature !==
                razorpay_signature
            ) {
                return res.status(400).json({
                    message:
                        "Payment verification failed"
                });
            }


            // ======================================
            // 6. FETCH ACTUAL RAZORPAY PAYMENT
            // ======================================

            const payment =
                await razorpay.payments.fetch(
                    razorpay_payment_id
                );


            // ======================================
            // 7. CONFIRM PAYMENT BELONGS TO ORDER
            // ======================================

            if (
                String(payment.order_id) !==
                String(razorpay_order_id)
            ) {
                return res.status(400).json({
                    message:
                        "Payment does not belong to this Razorpay order"
                });
            }


            // ======================================
            // 8. CHECK PAYMENT STATUS
            // ======================================

            if (payment.status !== "captured") {
                return res.status(400).json({
                    message:
                        `Payment is not captured. Current status: ${payment.status}`
                });
            }


            // ======================================
            // 9. VERIFY PAYMENT AMOUNT
            // ======================================

            if (
                Number(payment.amount) !==
                Number(order.amount)
            ) {
                return res.status(400).json({
                    message:
                        "Payment amount does not match order amount"
                });
            }


            // ======================================
            // 10. DUPLICATE PAYMENT CHECK
            // ======================================

            const existingPayment =
                await pool.query(
                    `SELECT
                        id,
                        transaction_reference
                     FROM transactions
                     WHERE razorpay_payment_id = $1`,
                    [razorpay_payment_id]
                );


            if (
                existingPayment.rows.length > 0
            ) {
                return res.status(409).json({
                    message:
                        "Payment has already been processed",

                    transaction_reference:
                        existingPayment
                            .rows[0]
                            .transaction_reference
                });
            }


            // ======================================
            // 11. CONVERT PAISE → RUPEES
            // ======================================

            const amountInRupees =
                Number(order.amount) / 100;


            // ======================================
            // 12. GENERATE INTERNAL REFERENCE
            // ======================================

            const transactionReference =
                "TXN_" +
                crypto
                    .randomBytes(8)
                    .toString("hex")
                    .toUpperCase();


            // ======================================
            // 13. SAVE SUCCESSFUL TRANSACTION
            // ======================================

            const result =
                await pool.query(
                    `INSERT INTO transactions
                    (
                        user_id,
                        amount,
                        currency,
                        status,
                        payment_method,
                        transaction_reference,
                        razorpay_payment_id,
                        razorpay_order_id,
                        failure_reason
                    )

                    VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)

                    RETURNING
                        id,
                        user_id,
                        amount,
                        currency,
                        status,
                        payment_method,
                        transaction_reference,
                        razorpay_payment_id,
                        razorpay_order_id,
                        failure_reason,
                        created_at`,
                    [
                        req.user.id,

                        amountInRupees,

                        order.currency,

                        "SUCCESS",

                        payment.method ||
                            "RAZORPAY",

                        transactionReference,

                        razorpay_payment_id,

                        razorpay_order_id,

                        null
                    ]
                );


            // ======================================
            // 14. SUCCESS RESPONSE
            // ======================================

            res.status(200).json({
                message:
                    "Payment verified successfully",

                transaction:
                    result.rows[0]
            });


        } catch (error) {

            console.error(
                "Payment verification error:",
                error
            );


            // Database UNIQUE constraint
            // caught duplicate request at DB level

            if (error.code === "23505") {
                return res.status(409).json({
                    message:
                        "Payment has already been processed"
                });
            }


            res.status(500).json({
                message:
                    "Payment verification failed"
            });
        }
    }
);


// ==========================================
// RECORD FAILED PAYMENT
// ==========================================

router.post(
    "/record-failure",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                razorpay_order_id,
                razorpay_payment_id,
                failure_reason
            } = req.body;


            // ======================================
            // 1. ORDER ID REQUIRED
            // ======================================

            if (!razorpay_order_id) {
                return res.status(400).json({
                    message:
                        "Razorpay order ID is required"
                });
            }


            // ======================================
            // 2. FETCH RAZORPAY ORDER
            // ======================================

            const order =
                await razorpay.orders.fetch(
                    razorpay_order_id
                );


            // ======================================
            // 3. VERIFY ORDER OWNERSHIP
            // ======================================

            if (
                String(order.notes?.user_id) !==
                String(req.user.id)
            ) {
                return res.status(403).json({
                    message:
                        "You are not authorized to record this payment"
                });
            }


            // Default method if Razorpay
            // payment entity isn't available.

            let actualPaymentMethod =
                "RAZORPAY";


            // ======================================
            // 4. IF PAYMENT ID EXISTS
            // ======================================

            if (razorpay_payment_id) {

                // ------------------------------
                // DUPLICATE CHECK
                // ------------------------------

                const existingPayment =
                    await pool.query(
                        `SELECT
                            id,
                            transaction_reference
                         FROM transactions
                         WHERE razorpay_payment_id = $1`,
                        [razorpay_payment_id]
                    );


                if (
                    existingPayment.rows.length > 0
                ) {
                    return res.status(409).json({
                        message:
                            "Payment has already been recorded",

                        transaction_reference:
                            existingPayment
                                .rows[0]
                                .transaction_reference
                    });
                }


                // ------------------------------
                // FETCH FAILED PAYMENT
                // ------------------------------

                const failedPayment =
                    await razorpay.payments.fetch(
                        razorpay_payment_id
                    );


                // ------------------------------
                // VERIFY PAYMENT → ORDER
                // ------------------------------

                if (
                    String(failedPayment.order_id) !==
                    String(razorpay_order_id)
                ) {
                    return res.status(400).json({
                        message:
                            "Payment does not belong to this Razorpay order"
                    });
                }


                // ------------------------------
                // GET REAL PAYMENT METHOD
                // ------------------------------

                if (failedPayment.method) {
                    actualPaymentMethod =
                        failedPayment.method;
                }
            }


            // ======================================
            // 5. TRUSTED AMOUNT FROM ORDER
            // ======================================

            const amountInRupees =
                Number(order.amount) / 100;


            // ======================================
            // 6. FAILURE REASON
            // ======================================

            const savedFailureReason =
                failure_reason
                    ? String(failure_reason)
                        .slice(0, 500)
                    : "Payment failed";


            // ======================================
            // 7. INTERNAL TRANSACTION REFERENCE
            // ======================================

            const transactionReference =
                "TXN_" +
                crypto
                    .randomBytes(8)
                    .toString("hex")
                    .toUpperCase();


            // ======================================
            // 8. SAVE FAILED TRANSACTION
            // ======================================

            const result =
                await pool.query(
                    `INSERT INTO transactions
                    (
                        user_id,
                        amount,
                        currency,
                        status,
                        payment_method,
                        transaction_reference,
                        razorpay_payment_id,
                        razorpay_order_id,
                        failure_reason
                    )

                    VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)

                    RETURNING
                        id,
                        user_id,
                        amount,
                        currency,
                        status,
                        payment_method,
                        transaction_reference,
                        razorpay_payment_id,
                        razorpay_order_id,
                        failure_reason,
                        created_at`,
                    [
                        req.user.id,

                        amountInRupees,

                        order.currency,

                        "FAILED",

                        actualPaymentMethod,

                        transactionReference,

                        razorpay_payment_id ||
                            null,

                        razorpay_order_id,

                        savedFailureReason
                    ]
                );


            // ======================================
            // 9. RESPONSE
            // ======================================

            res.status(201).json({
                message:
                    "Failed payment recorded",

                transaction:
                    result.rows[0]
            });


        } catch (error) {

            console.error(
                "Failed payment recording error:",
                error
            );


            if (error.code === "23505") {
                return res.status(409).json({
                    message:
                        "Payment has already been recorded"
                });
            }


            res.status(500).json({
                message:
                    "Failed to record payment failure"
            });
        }
    }
);


// ==========================================
// PAYMENT HISTORY
// ==========================================

router.get(
    "/history",
    authenticateToken,
    async (req, res) => {

        try {

            const user_id =
                req.user.id;


            const result =
                await pool.query(
                    `SELECT
                        id,
                        amount,
                        currency,
                        status,
                        payment_method,
                        transaction_reference,
                        razorpay_payment_id,
                        razorpay_order_id,
                        failure_reason,
                        created_at

                     FROM transactions

                     WHERE user_id = $1

                     ORDER BY created_at DESC`,
                    [user_id]
                );


            res.status(200).json({
                message:
                    "Payment history fetched successfully",

                transactions:
                    result.rows
            });


        } catch (error) {

            console.error(
                "Payment history error:",
                error
            );


            res.status(500).json({
                message:
                    "Failed to fetch payment history"
            });
        }
    }
);


// ==========================================
// GET PAYMENT STATUS
// ==========================================

router.get(
    "/:transaction_reference",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                transaction_reference
            } = req.params;


            const result =
                await pool.query(
                    `SELECT
                        id,
                        user_id,
                        amount,
                        currency,
                        status,
                        payment_method,
                        transaction_reference,
                        razorpay_payment_id,
                        razorpay_order_id,
                        failure_reason,
                        created_at

                     FROM transactions

                     WHERE transaction_reference = $1
                     AND user_id = $2`,
                    [
                        transaction_reference,
                        req.user.id
                    ]
                );


            if (
                result.rows.length === 0
            ) {
                return res.status(404).json({
                    message:
                        "Transaction not found"
                });
            }


            res.status(200).json({
                message:
                    "Transaction fetched successfully",

                transaction:
                    result.rows[0]
            });


        } catch (error) {

            console.error(
                "Transaction lookup error:",
                error
            );


            res.status(500).json({
                message:
                    "Failed to fetch transaction"
            });
        }
    }
);


module.exports = router;