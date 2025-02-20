const admin = require("firebase-admin");
const { RoomMembership } = require("../models");

// 🔹 Load the service account JSON
const serviceAccount = require("../teamixflutter-f8b68756f912.json");

// 🔹 Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

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

        const message = {
            tokens: tokens, // 🔹 Send to multiple users at once
            notification: { title, body },
            data: dataPayload,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`✅ Notification sent to user ${auth0Id}`, response);
    } catch (error) {
        console.error(`❌ Failed to send notification: ${error.message}`);
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

        const message = {
            tokens: tokens,
            notification: { title, body },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`✅ Room notification sent to ${tokens.length} players in room ${roomId}`, response);
    } catch (error) {
        console.error(`❌ Failed to send room notification: ${error.message}`);
    }
};

module.exports = {
    saveFcmToken,
    sendNotificationToUser,
    sendRoomNotification,
};
