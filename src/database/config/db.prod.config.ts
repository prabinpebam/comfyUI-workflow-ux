import { MongoClient, MongoClientOptions } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Match the exact format of the working Azure Cosmos DB connection string
const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.MONGODB_USER}@&authMechanism=SCRAM-SHA-256&authSource=admin`;

export const dbConfig: { url: string; options: MongoClientOptions } = {
    url: COSMOS_CONNECTION,
    options: {
        ssl: true,
        directConnection: true,  // Bypass topology discovery
        maxPoolSize: 10,
        minPoolSize: 0,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 360000
    }
};