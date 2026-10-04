// apps/api/src/tests/setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Unique/text indexes are created lazily by Mongoose; force them so that
  // duplicate-key behaviour is deterministic from the first test.
  await Promise.all(Object.values(mongoose.models).map(model => model.syncIndexes()));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map(collection => collection.deleteMany({})));
});

afterEach(() => {
  jest.clearAllMocks();
});
