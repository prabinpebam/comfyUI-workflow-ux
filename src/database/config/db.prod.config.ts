import { MongoClient, MongoClientOptions } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Azure Cosmos DB MongoDB API - DIRECT FORMAT WITH CORRECT AUTH PARAMETERS
const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:10255/?ssl=true&authSource=admin&replicaSet=globaldb&appName=@${process.env.MONGODB_USER}@&retryWrites=false`;

export const dbConfig: { url: string; options: MongoClientOptions } = {
    url: COSMOS_CONNECTION,
    options: {
        ssl: true,
        // No serverApi specified - this is critical for MongoDB 4.0 compatibility
        directConnection: true,
        maxPoolSize: 1
    }
};