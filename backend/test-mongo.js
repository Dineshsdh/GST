const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI;

console.log("Testing MongoDB Connection...");
console.log("URI:", uri ? uri.replace(/:([^:@]+)@/, ':****@') : "undefined"); // Mask password

if (!uri) {
    console.error("❌ MONGO_URI is missing in .env file");
    process.exit(1);
}

mongoose.connect(uri)
    .then(() => {
        console.log("✅ Connection Successful!");
        console.log("You can now start the backend server with 'npm start'");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Connection Failed:");
        console.error(err.message);
        console.log("\nPossible solutions:");
        console.log("1. Check if the password in .env is correct (no special characters unless URL encoded).");
        console.log("2. Whitelist your IP address in MongoDB Atlas (Network Access > Add IP Address > Allow Access from Anywhere).");
        console.log("3. If using a corporate VPN/Firewall, try disconnecting or using a mobile hotspot.");
        console.log("4. Verify the hostname (the distinct part of the URI) is correct.");
        process.exit(1);
    });
