import { describe, expect, it } from 'vitest';
import { parseSqlDdl, parseOpenApiSpec } from '../src/utils/schemaParsers.js';
import { parseDataDiagramFile } from '../src/utils/dataDiagram.js';

describe('schemaParsers', () => {
  it('parses SQL DDL scripts with CREATE TABLE and FOREIGN KEY constraints', () => {
    const sql = `
      -- Users Table
      CREATE TABLE users (
        id INT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(255)
      );

      /* Orders Table */
      CREATE TABLE orders (
        order_id INT PRIMARY KEY,
        user_id INT,
        total DECIMAL(10,2),
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    const rows = parseSqlDdl(sql);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('users');
    expect(rows[1].id).toBe('orders');
    expect(rows[1].parent_id).toBe('users');
    expect(rows[1].references).toContain('user_id ➜ users');
  });

  it('parses OpenAPI 3.0 / Swagger JSON specifications into route cards', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Doodle API', version: '1.0.0' },
      paths: {
        '/auth/login': {
          post: {
            tags: ['Auth Service'],
            summary: 'Authenticate user',
          },
        },
        '/users': {
          get: {
            tags: ['User Service'],
            summary: 'List users',
          },
        },
      },
    };

    const rows = parseOpenApiSpec(spec);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('POST /auth/login');
    expect(rows[0].parent_id).toBe('Auth Service');
    expect(rows[1].id).toBe('GET /users');
    expect(rows[1].parent_id).toBe('User Service');
  });

  it('routes SQL files through parseDataDiagramFile seamlessly', () => {
    const sql = `
      CREATE TABLE projects (id INT PRIMARY KEY, title TEXT);
      CREATE TABLE tasks (id INT PRIMARY KEY, project_id INT REFERENCES projects(id));
    `;
    const rows = parseDataDiagramFile(sql, 'schema.sql');
    expect(rows).toHaveLength(2);
    expect(rows[1].parent_id).toBe('projects');
  });
});
