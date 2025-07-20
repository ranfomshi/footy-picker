/**
 * Utility functions for handling player avatars
 */

/**
 * Generate a simple hash from a string (for consistent colors)
 * @param {string} str - The string to hash
 * @returns {number} A simple hash number
 */
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
};

/**
 * Get a consistent color for a player based on their name/ID
 * @param {Object} player - The player object
 * @returns {string} A hex color
 */
export const getPlayerColor = (player) => {
    const colors = [
        '#f56a00', '#7265e6', '#00b96b', '#eb2f96', '#52c41a',
        '#1890ff', '#fa8c16', '#722ed1', '#13c2c2', '#faad14'
    ];

    const identifier = player.auth0Id || player.name || player.id;
    const hash = simpleHash(identifier.toString());
    return colors[hash % colors.length];
};

/**
 * Get avatar URL for a player
 * @param {Object} player - The player object
 * @param {string} player.auth0Id - The Auth0 ID
 * @param {string} player.profilePicture - Auth0 profile picture URL
 * @param {string} player.name - Player name for fallback
 * @returns {string|null} Avatar URL or null for fallback icon
 */
export const getPlayerAvatarUrl = (player) => {
    // If we have a profile picture from Auth0, use it
    if (player.profilePicture) {
        return player.profilePicture;
    }

    // No avatar available, use fallback
    return null;
};

/**
 * Get initials from a name for fallback avatar
 * @param {string} name - The player name
 * @returns {string} Initials (max 2 characters)
 */
export const getPlayerInitials = (name) => {
    if (!name) return '?';

    const words = name.trim().split(' ');
    if (words.length === 1) {
        return words[0].charAt(0).toUpperCase();
    }

    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};
