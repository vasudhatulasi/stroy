import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Test the connection
api.get('/').then(response => {
    console.log('API Connection successful:', response.data);
}).catch(error => {
    console.error('API Connection failed:', error.message);
    console.error('Full error:', error);
});

export default api;
