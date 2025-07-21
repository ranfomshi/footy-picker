// Mixpanel Test Script
// Open browser console and run this to test Mixpanel integration

// Check if Mixpanel is initialized
console.log('Testing Mixpanel Setup...');
console.log('Token:', import.meta.env.VITE_MIXPANEL_TOKEN ? 'Found' : 'Missing');

// Import your tracking functions
import { trackEvent, trackPageView } from './src/utils/mixpanel.js';

// Test basic event tracking
const testMixpanel = () => {
    console.log('Sending test event...');

    // Test a simple event
    trackEvent('Mixpanel Test Event', {
        test_property: 'test_value',
        timestamp_test: new Date().toISOString(),
        source: 'manual_test'
    });

    // Test page view
    trackPageView('Test Page', {
        test_context: 'setup_verification'
    });

    console.log('Test events sent! Check your Mixpanel dashboard.');
};

// Make test function available globally
window.testMixpanel = testMixpanel;

console.log('✅ Test function ready! Run testMixpanel() in console to send test events.');
