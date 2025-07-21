// Environment variable test
console.log('=== ENVIRONMENT VARIABLE TEST ===');
console.log('All env vars:', import.meta.env);
console.log('VITE_MIXPANEL_TOKEN:', import.meta.env.VITE_MIXPANEL_TOKEN);
console.log('DEV mode:', import.meta.env.DEV);
console.log('MODE:', import.meta.env.MODE);

// Test if we can read the env file directly
fetch('/.env')
    .then(response => response.text())
    .then(text => console.log('.env file contents:', text))
    .catch(error => console.log('Cannot read .env file (this is normal):', error.message));
