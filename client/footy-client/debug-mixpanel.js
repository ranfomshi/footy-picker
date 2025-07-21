// Simple standalone test for Mixpanel
import mixpanel from 'mixpanel-browser';

console.log('🔍 MIXPANEL DEBUG TEST');
console.log('Environment:', import.meta.env.MODE);
console.log('Token from env:', import.meta.env.VITE_MIXPANEL_TOKEN);

const token = import.meta.env.VITE_MIXPANEL_TOKEN;

if (!token || token === 'YOUR_MIXPANEL_TOKEN_HERE') {
    console.error('❌ No valid Mixpanel token found!');
    console.log('Token value:', token);
} else {
    console.log('✅ Token found, initializing Mixpanel...');

    try {
        mixpanel.init(token, {
            debug: true, // Force debug mode
            track_pageview: false, // Disable automatic pageviews for testing
            persistence: 'localStorage',
            ip: false,
            api_host: 'https://api.mixpanel.com',
        });

        console.log('✅ Mixpanel initialized successfully');

        // Test event
        console.log('📊 Sending test event...');
        mixpanel.track('Debug Test Event', {
            test_property: 'debug_value',
            timestamp: new Date().toISOString(),
            source: 'debug_test',
            token_used: token.substring(0, 8) + '...' // Show first 8 chars for verification
        });

        console.log('✅ Test event sent! Check your Mixpanel dashboard.');

        // Make test function globally available
        window.mixpanelDebugTest = () => {
            mixpanel.track('Manual Debug Test', {
                manual_test: true,
                timestamp: new Date().toISOString()
            });
            console.log('Manual test event sent!');
        };

        console.log('🧪 Run mixpanelDebugTest() to send another test event');

    } catch (error) {
        console.error('❌ Error initializing Mixpanel:', error);
    }
}
