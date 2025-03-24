import { MongoClient, MongoClientOptions } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Azure Cosmos DB MongoDB API 4.0 connection string format
const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:443/?ssl=true&replicaSet=${process.env.MONGODB_REPLICA_SET || 'globaldb'}&authSource=admin`;

export const dbConfig: { url: string; options: MongoClientOptions } = {
    url: COSMOS_CONNECTION,
    options: {
        // Cosmos DB specific settings
        ssl: true,
        retryWrites: false,
        
        // Connection management
        maxPoolSize: 100,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 30000
    }
};