import { MongoClient, ServerApiVersion, MongoClientOptions } from 'mongodb';
import * as dotenv from 'dotenv';
import { dbConfig as prodConfig } from './db.prod.config';

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';

export const dbConfig: { url: string; options: MongoClientOptions } = isDevelopment ? {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/comfyui-workflow-database',
    options: {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    }
} : prodConfig;

let client: MongoClient | null = null;

export async function connectToDatabase(): Promise<MongoClient> {
    if (client) {
        return client;
    }

    try {
        client = new MongoClient(dbConfig.url, dbConfig.options);
        await client.connect();
        console.log('Successfully connected to MongoDB.');
        return client;
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        throw err;
    }
}

export async function getDb() {
    if (!client) {
        client = await connectToDatabase();
    }
    return client.db();
}