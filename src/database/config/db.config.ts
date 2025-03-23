import { MongoClient, ServerApiVersion } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'mongodb://localhost:27017/comfyui-workflow-database';

export const dbConfig = {
  url: connectionString,
  options: {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  }
};

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