import axios from 'axios';

const api = axios.create({
    baseURL: 'https://stroy-5.onrender.com',
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
