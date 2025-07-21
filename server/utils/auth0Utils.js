// utils/auth0Utils.js
const axios = require('axios');

// Cache for management token
let managementToken = null;
let tokenExpiry = 0;

/**
 * Get a management token for Auth0 API calls
 */
const getManagementToken = async () => {
    // Check if we have a valid cached token
    if (managementToken && Date.now() < tokenExpiry) {
        console.log('🔄 Using cached Auth0 management token');
        return managementToken;
    }

    console.log('🔑 Requesting new Auth0 management token...');
    console.log('Auth0 Domain:', process.env.AUTH0_DOMAIN);
    console.log('Auth0 Client ID:', process.env.AUTH0_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('Auth0 Client Secret:', process.env.AUTH0_CLIENT_SECRET ? 'SET' : 'NOT SET');

    try {
        const response = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
            grant_type: 'client_credentials'
        });

        managementToken = response.data.access_token;
        // Set expiry to 5 minutes before actual expiry for safety
        tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

        console.log('✅ Auth0 management token obtained successfully');
        console.log('Token expires in:', response.data.expires_in, 'seconds');
        return managementToken;
    } catch (error) {
        console.error('❌ Failed to get Auth0 management token:');
        console.error('Error message:', error.message);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        return null;
    }
};

/**
 * Get Auth0 user profile including profile picture
 */
const getAuth0UserProfile = async (auth0Id) => {
    console.log('👤 Fetching Auth0 profile for user:', auth0Id);

    try {
        const token = await getManagementToken();
        if (!token) {
            console.log('❌ No management token available for user:', auth0Id);
            return null;
        }

        console.log('🌐 Making Auth0 Management API call for user:', auth0Id);
        const response = await axios.get(
            `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0Id)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        console.log('✅ Auth0 profile data received for user:', auth0Id);
        console.log('Profile picture URL:', response.data.picture || 'NO PICTURE');
        console.log('Profile name:', response.data.name || 'NO NAME');
        console.log('Profile email:', response.data.email || 'NO EMAIL');

        return {
            picture: response.data.picture,
            name: response.data.name,
            email: response.data.email,
        };
    } catch (error) {
        console.error(`❌ Failed to fetch Auth0 profile for ${auth0Id}:`);
        console.error('Error message:', error.message);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        return null;
    }
};

module.exports = {
    getAuth0UserProfile,
    getManagementToken
};
