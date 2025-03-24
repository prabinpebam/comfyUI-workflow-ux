import { MongoClient, MongoClientOptions } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Match the EXACT format from the successful test
const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.MONGODB_USER}@&authMechanism=SCRAM-SHA-256&authSource=admin`;

export const dbConfig: { url: string; options: MongoClientOptions } = {
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

let client: MongoClient | null = null;

export async function connectToDatabase(): Promise<MongoClient> {
    if (client) {
        return client;
    }

    try {
        console.log(`Connecting to MongoDB at ${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT || '10255'}...`);
        
        // Create client with the correct options
        client = new MongoClient(dbConfig.url, dbConfig.options);
        
        // Connect WITHOUT any additional options/parameters
        await client.connect();
        
        console.log('Successfully connected to MongoDB.');
        return client;
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        throw err;
    }
}