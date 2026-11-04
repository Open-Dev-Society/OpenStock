import type { Connection, Model, Schema } from 'mongoose';
import { isWorkersRuntime } from '@/database/mongoose';

// What connectToDatabase() returns: the mongoose module on Node, or `{ connection }` on Workers.
export type DbHandle = { connection: Connection };

// Compiled outside the generic so tsc does not expand Connection#model.
function bind(conn: Connection, name: string, schema: Schema): object {
    const models = conn.models as Record<string, object | undefined>;
    const compile = conn.model as (name: string, schema: Schema) => object;
    return models[name] ?? compile(name, schema);
}

// On Workers, queries must use the connection opened for this request.
// On Node/Vercel, `fallback` is the model already compiled on the shared connection.
export function modelOn<T>(db: DbHandle, name: string, schema: Schema, fallback: Model<T>): Model<T> {
    if (!isWorkersRuntime()) return fallback;
    return bind(db.connection, name, schema) as Model<T>;
}
