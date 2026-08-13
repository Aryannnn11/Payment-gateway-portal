const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;

        // Dashboard statistics
        const result = await pool.query(
            `SELECT
                COALESCE(
                    SUM(amount) FILTER (WHERE status = 'SUCCESS'),
                    0
                ) AS total_amount,

                COUNT(*) AS total_transactions,

                COUNT(*) FILTER (
                    WHERE status = 'SUCCESS'
                ) AS successful_transactions,

                COUNT(*) FILTER (
                    WHERE status = 'FAILED'
                ) AS failed_transactions

            FROM transactions
            WHERE user_id = $1`,
            [user_id]
        );

        // Recent 5 transactions
        const recentTransactions = await pool.query(
            `SELECT
                id,
                amount,
                currency,
                status,
                payment_method,
                transaction_reference,
                razorpay_payment_id,
                created_at
            FROM transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 5`,
            [user_id]
        );


        const monthlyPayments = await pool.query(
            `SELECT
                TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
                COALESCE(SUM(amount), 0) AS total_amount
            FROM transactions
            WHERE user_id = $1
            AND status = 'SUCCESS'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at) ASC`,
            [user_id]
        );

        // Send ONE response
        res.status(200).json({
            message: "Dashboard data fetched successfully",

            total_amount: result.rows[0].total_amount,
            total_transactions: result.rows[0].total_transactions,
            successful_transactions:
                result.rows[0].successful_transactions,
            failed_transactions:
                result.rows[0].failed_transactions,

            recent_transactions: recentTransactions.rows,
            monthly_payments: monthlyPayments.rows
        });

    } catch (error) {
        console.error("Dashboard error:", error);

        res.status(500).json({
            message: "Failed to fetch dashboard data"
        });
    }
});

module.exports = router;