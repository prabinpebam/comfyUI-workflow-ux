import { MongoClient, ServerApiVersion, MongoClientOptions } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/?ssl=true&replicaSet=${process.env.MONGODB_REPLICA_SET || 'globaldb'}`;

export const dbConfig: { url: string; options: MongoClientOptions } = {
    url: COSMOS_CONNECTION,
    options: {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
        ssl: true,
        replicaSet: process.env.MONGODB_REPLICA_SET || 'globaldb',
        retryWrites: false,
        maxIdleTimeMS: 120000,
        authSource: '$external',
        authMechanism: 'SCRAM-SHA-256' as const // Type assertion to make it match AuthMechanism
    }
};