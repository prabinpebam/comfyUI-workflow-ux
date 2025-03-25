"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
exports.connectToDatabase = connectToDatabase;
exports.getDb = getDb;
const mongodb_1 = require("mongodb");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.MONGODB_USER}@&authMechanism=SCRAM-SHA-256&authSource=admin`;
exports.dbConfig = {
    url: COSMOS_CONNECTION,
    options: {
        ssl: true,
        directConnection: true,
        maxPoolSize: 10,
        minPoolSize: 0,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 360000
    }
};
let client = null;
async function connectToDatabase() {
    if (client) {
        return client;
    }
    try {
        console.log(`Connecting to MongoDB at ${process.env.MONGODB_HOST}:10255...`);
        client = new mongodb_1.MongoClient(exports.dbConfig.url, exports.dbConfig.options);
        await client.connect();
        console.log('Successfully connected to MongoDB.');
        return client;
    }
    catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        throw err;
    }
}
async function getDb() {
    if (!client) {
        client = await connectToDatabase();
    }
    return client.db();
}
module.exports = {
    connectToDatabase: connectToDatabase,
    getDb: getDb,
    dbConfig: exports.dbConfig
};
console.log('db.prod.config module loaded');
console.log('connectToDatabase type:', typeof connectToDatabase);
