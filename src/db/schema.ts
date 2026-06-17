import type { Database } from "bun:sqlite";

//@ts-expect-error
import migrations from './migrations.sql' with { type: 'text' };

export function migrate(db: Database) {
    if (migrations) db.query(migrations).run()
}
