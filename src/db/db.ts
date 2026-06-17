import { constants, Database } from "bun:sqlite";
import { migrate } from "./schema";

export function initDb(path: string) {
    const db = new Database(path, { strict: true, create: true });

    db.run("PRAGMA journal_mode = WAL;");

    migrate(db);

    return {
        db,
        close() {
            db.fileControl(constants.SQLITE_FCNTL_PERSIST_WAL, 0);
            db.run("PRAGMA wal_checkpoint(TRUNCATE);");
            db.close();
        }
    } as const
}
