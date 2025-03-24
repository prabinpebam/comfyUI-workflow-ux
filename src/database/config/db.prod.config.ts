import { MongoClient, MongoClientOptions } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Match the exact format of the working Azure Cosmos DB connection string
const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.MONGODB_USER}@`;

export const dbConfig: { url: string; options: MongoClientOptions } = {
    url: COSMOS_CONNECTION,
    options: {
        ssl: true,
        // Remove authMechanism, authSource and replicaSet as they're included in the connection string
        // Remove retryWrites as it's in the connection string as retrywrites
        
        // Connection pooling settings
        maxPoolSize: 10,
        minPoolSize: 0,
        
        // Timeouts
        connectTimeoutMS: 30000,
        socketTimeoutMS: 360000
    }
};