const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const razorpay = require("../config/razorpay");

const router = express.Router();

// This router is mounted with express.raw() BEFORE express.json() in server.js.
// Razorpay signs the exact request bytes, not a re-serialized JSON object.
router.post("/razorpay", async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.get("x-razorpay-signature");
    const eventId = req.get("x-razorpay-event-id");

    if (!secret) {
        console.error("Webhook secret is not configured");
        return res.status(503).json({ message: "Webhook unavailable" });
    }

    if (!Buffer.isBuffer(req.body) || !signature || !/^[0-9a-f]{64}$/i.test(signature)) {
        return res.status(400).json({ message: "Invalid webhook request" });
    }

    const expected = crypto.createHmac("sha256", secret).update(req.body).digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
        return res.status(401).json({ message: "Invalid webhook signature" });
    }

    let event;
    try {
        event = JSON.parse(req.body.toString("utf8"));
    } catch {
        return res.status(400).json({ message: "Invalid JSON" });
    }

    if (!eventId || typeof eventId !== "string" || eventId.length > 255) {
        return res.status(400).json({ message: "Missing event ID" });
    }

    const eventType = event.event;
    if (eventType !== "payment.captured" && eventType !== "payment.failed") {
        return res.status(200).json({ message: "Event ignored" });
    }

    const paymentId = event.payload?.payment?.entity?.id;
    if (typeof paymentId !== "string" || !paymentId) {
        return res.status(400).json({ message: "Missing payment ID" });
    }

    // Fetch trusted details from Razorpay rather than relying on webhook payload fields.
    let payment, order;
    try {
        payment = await razorpay.payments.fetch(paymentId);
        if (!payment.order_id) {
            return res.status(400).json({ message: "Payment has no order" });
        }
        order = await razorpay.orders.fetch(payment.order_id);
    } catch (error) {
        console.error("Webhook Razorpay lookup error:", error);
        return res.status(500).json({ message: "Unable to verify payment" });
    }

    const userId = order.notes?.user_id;
    if (!/^\d+$/.test(String(userId || "")) ||
        String(payment.order_id) !== String(order.id) ||
        Number(payment.amount) !== Number(order.amount) ||
        String(payment.currency) !== String(order.currency)) {
        console.error("Webhook payment/order validation failed:", eventId);
        return res.status(400).json({ message: "Invalid payment ownership or amount" });
    }

    // Use the current verified status to handle out-of-order event deliveries.
    if (payment.status !== "captured" && payment.status !== "failed") {
        console.error("Webhook payment not in a final state:", payment.status);
        return res.status(500).json({ message: "Payment not finalized; retry later" });
    }

    const status = payment.status === "captured" ? "SUCCESS" : "FAILED";
    const failureReason = status === "FAILED"
        ? String(payment.error_description || payment.error_reason || "Payment failed").slice(0, 500)
        : null;

    const client = await pool.connect().catch((error) => {
        console.error("Webhook DB connection error:", error);
        return null;
    });
    if (!client) return res.status(500).json({ message: "Database unavailable" });

    try {
        await client.query("BEGIN");

        // Unique event ID makes redelivery safe. Rollback also removes it on errors.
        const insertedEvent = await client.query(
            `INSERT INTO webhook_events (event_id, event_type)
             VALUES ($1, $2)
             ON CONFLICT (event_id) DO NOTHING
             RETURNING event_id`,
            [eventId, eventType]
        );

        if (insertedEvent.rowCount === 0) {
            await client.query("COMMIT");
            return res.status(200).json({ message: "Duplicate event ignored" });
        }

        const reference = "TXN_" + crypto.randomBytes(8).toString("hex").toUpperCase();
        const result = await client.query(
            `INSERT INTO transactions (
                user_id, amount, currency, status, payment_method,
                transaction_reference, razorpay_payment_id,
                razorpay_order_id, failure_reason
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (razorpay_payment_id) DO UPDATE SET
                status = CASE
                    WHEN transactions.status = 'SUCCESS' THEN 'SUCCESS'
                    ELSE EXCLUDED.status
                END,
                failure_reason = CASE
                    WHEN transactions.status = 'SUCCESS' OR EXCLUDED.status = 'SUCCESS' THEN NULL
                    ELSE EXCLUDED.failure_reason
                END,
                payment_method = EXCLUDED.payment_method
             WHERE transactions.user_id = EXCLUDED.user_id
               AND transactions.razorpay_order_id = EXCLUDED.razorpay_order_id
             RETURNING id`,
            [
                userId,
                Number(order.amount) / 100,
                order.currency,
                status,
                payment.method || "RAZORPAY",
                reference,
                payment.id,
                order.id,
                failureReason
            ]
        );

        if (result.rowCount !== 1) {
            throw new Error("Conflicting transaction ownership or order");
        }

        await client.query("COMMIT");
        console.log("Razorpay webhook processed:", eventType, eventId);
        return res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
        await client.query("ROLLBACK").catch((rollbackError) => {
            console.error("Webhook rollback error:", rollbackError);
        });
        console.error("Webhook processing error:", error);
        return res.status(500).json({ message: "Webhook processing failed" });
    } finally {
        client.release();
    }
});

module.exports = router;
