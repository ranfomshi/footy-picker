const axios = require("axios");
const { Player, RoomMembership } = require("../models");

const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY || "f8b68756f91217ec901340768d8a08d8551ca94b";
const FIREBASE_API_URL = "https://fcm.googleapis.com/fcm/send";

/**
 * 🔹 Store FCM Token for a User (Auth0 ID)
 */
const saveFcmToken = async (auth0Id, fcmToken) => {
    try {
        const memberships = await RoomMembership.findAll({ where: { auth0Id } });

        if (memberships.length === 0) {
            return { error: "❌ User not found in any room" };
        }

        // ✅ Store the token in RoomMembership instead of Player
        await RoomMembership.update({ fcmToken }, { where: { auth0Id } });

        return { message: "✅ Token saved successfully for all associated rooms" };
    } catch (error) {
        console.error("❌ Error saving token:", error);
        return { error: "Failed to save FCM token" };
    }
};

/**
 * 🔹 Send Notification to All Users Linked to an Auth0 ID
 */
const sendNotificationToUser = async (auth0Id, title, body, dataPayload = {}) => {
    try {
        const memberships = await RoomMembership.findAll({ where: { auth0Id } });

        const tokens = memberships
            .map((m) => m.fcmToken)
            .filter((token) => token !== null);

        if (tokens.length === 0) {
            console.log(`❌ No FCM token found for user ${auth0Id}`);
            return;
        }

        const headers = {
            "Content-Type": "application/json",
            Authorization: `key=${FIREBASE_SERVER_KEY}`,
        };

        const payload = {
            registration_ids: tokens, // 🔹 Send to multiple tokens at once
            notification: { title, body },
            data: dataPayload,
        };

        const response = await axios.post(FIREBASE_API_URL, payload, { headers });
        console.log(`✅ Notification sent to user ${auth0Id}`, response.data);
    } catch (error) {
        console.error(`❌ Failed to send notification: ${error.response?.data || error.message}`);
    }
};

/**
 * 🔹 Send Notification to All Users in a Room
 */
const sendRoomNotification = async (roomId, title, body) => {
    try {
        const memberships = await RoomMembership.findAll({ where: { roomId } });

        const tokens = memberships
            .map((m) => m.fcmToken)
            .filter((token) => token !== null);

        if (tokens.length === 0) {
            console.log(`❌ No users in room ${roomId} have FCM tokens.`);
            return;
        }

        const headers = {
            "Content-Type": "application/json",
            Authorization: `key=${FIREBASE_SERVER_KEY}`,
        };

        const payload = {
            registration_ids: tokens,
            notification: { title, body },
        };

        const response = await axios.post(FIREBASE_API_URL, payload, { headers });
        console.log(`✅ Room notification sent to ${tokens.length} players in room ${roomId}`, response.data);
    } catch (error) {
        console.error(`❌ Failed to send room notification: ${error.response?.data || error.message}`);
    }
};

module.exports = {
    saveFcmToken,
    sendNotificationToUser,
    sendRoomNotification,
};