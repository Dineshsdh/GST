
const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function verify() {
    console.log('Verifying backend...');

    // 1. GET customers (should be empty or not error)
    try {
        const getRes = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/customers',
            method: 'GET'
        });
        console.log('GET /api/customers:', getRes.statusCode, getRes.body);
    } catch (e) {
        console.error('GET failed:', e.message);
    }

    // 2. POST customer
    const customer = JSON.stringify({
        name: 'Test Backend User',
        address: '123 Test St',
        gstin: '29ABCDE1234F1Z5',
        state: 'Karnataka',
        stateCode: '29'
    });

    let createdCustomer = null;
    try {
        const postRes = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/customers',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': customer.length
            }
        }, customer);
        console.log('POST /api/customers:', postRes.statusCode, postRes.body);
        if (postRes.statusCode === 201 || postRes.statusCode === 200) {
            createdCustomer = JSON.parse(postRes.body);
        }
    } catch (e) {
        console.error('POST failed:', e.message);
    }

    // 3. GET again
    try {
        const getRes2 = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/customers',
            method: 'GET'
        });
        console.log('GET /api/customers (after POST):', getRes2.statusCode, getRes2.body);
    } catch (e) {
        console.error('GET 2 failed:', e.message);
    }

    // 4. CLEANUP (Optional, depends on ID)
    if (createdCustomer && createdCustomer._id) {
        try {
            const delRes = await request({
                hostname: 'localhost',
                port: 5000,
                path: `/api/customers/${createdCustomer._id}`,
                method: 'DELETE'
            });
            console.log('DELETE /api/customers/:id:', delRes.statusCode, delRes.body);
        } catch (e) {
            console.error('DELETE failed:', e.message);
        }
    }
}

verify();
