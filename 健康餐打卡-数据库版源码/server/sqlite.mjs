import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function openDB(file){
 const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 // Local-only migration runner. Hosted migrations are applied by Sites before deploy.
 db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 if(!db.prepare('SELECT name FROM local_migrations WHERE name = ?').get('0000')){db.exec('BEGIN');try{db.exec(readFileSync(new URL('../drizzle/0000_meal_documents.sql',import.meta.url),'utf8'));db.prepare('INSERT INTO local_migrations(name) VALUES (?)').run('0000');db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}
 return {close:()=>db.close(),prepare(sql){let values=[];return {bind(...args){values=args;return this},async first(){return db.prepare(sql).get(...values)||null},async run(){const result=db.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}}}}}};
}
