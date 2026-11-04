import { AsyncLocalStorage } from 'node:async_hooks';
import type { Connection, Model, Schema } from 'mongoose';

// One Mongoose connection per Workers request. Empty on Node/Vercel.
export const requestConnection = new AsyncLocalStorage<Connection>();

// Compiled outside the generic so tsc does not expand Connection#model.
function modelOn(conn: Connection, name: string, schema: Schema): object {
    const models = conn.models as Record<string, object | undefined>;
    const compile = conn.model as (name: string, schema: Schema) => object;
    return models[name] ?? compile(name, schema);
}

// Queries use the request connection when connectToDatabase() opened one.
// Otherwise this is the default model, which is what Node/Vercel already use.
export function requestModel<T>(name: string, schema: Schema, fallback: Model<T>): Model<T> {
    return new Proxy(fallback, {
        get(_target, prop) {
            const conn = requestConnection.getStore();
            const model = conn ? modelOn(conn, name, schema) : fallback;
            const value = Reflect.get(model, prop, model);
            return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(model) : value;
        },
    }) as Model<T>;
}
