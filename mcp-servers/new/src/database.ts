import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

export interface Tag {
  tag_name: string;
  tag_group: string;
  update_id: string;
  update_timestamp: Date;
}

export interface Template {
  template_id: string;
  json_data_layout: string[];
  json_data_situation?: string[];
  json_data_business?: string[];
  json_data_function?: string[];
  update_id: string;
  update_timestamp: Date;
}

export class DatabaseService {
  private client: MongoClient;
  private db: Db | null = null;

  constructor() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.client = new MongoClient(uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      const dbName = process.env.MONGODB_DATABASE || 'template_db';
      this.db = this.client.db(dbName);
      console.error('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  getTagsCollection(): Collection<Tag> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection<Tag>('tags');
  }

  getTemplatesCollection(): Collection<Template> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection<Template>('templates');
  }

  async getAllTags(): Promise<string[]> {
    const collection = this.getTagsCollection();
    const tags = await collection.find({}).toArray();
    return tags.map(tag => tag.tag_name);
  }

  async getAllTemplates(): Promise<Template[]> {
    const collection = this.getTemplatesCollection();
    return await collection.find({}).toArray();
  }

  async getTemplateById(templateId: string): Promise<Template | null> {
    const collection = this.getTemplatesCollection();
    return await collection.findOne({ template_id: templateId });
  }
}
