import { MongoClient, MongoClientOptions } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Azure standard format for Cosmos DB with MongoDB API 4.0
const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:10255/?ssl=true`;

export const dbConfig: { url: string; options: MongoClientOptions } = {
    url: COSMOS_CONNECTION,
    options: {
        // Required for Azure Cosmos DB 
        ssl: true,
        authMechanism: 'SCRAM-SHA-1', // Explicitly set auth mechanism
        authSource: 'admin',
        replicaSet: process.env.MONGODB_REPLICA_SET || 'globaldb',
        
        // Disable features not supported by Cosmos DB
        retryWrites: false,
        
        // Connection pooling settings
        maxPoolSize: 10,
        minPoolSize: 0,
        
        // Timeouts
        connectTimeoutMS: 30000,
        socketTimeoutMS: 360000
    }
};