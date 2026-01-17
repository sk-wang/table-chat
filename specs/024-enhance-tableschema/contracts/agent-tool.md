# Contracts: Enhance Table Schema Tool

The changes for this feature are primarily internal (backend models and connectors). There are no new REST API endpoints. The "contract" is the format of the string returned by the `get_table_schema` tool to the AI agent.

## Agent Tool Contract

**Tool**: `get_table_schema`

**Input**:
```json
{
  "table_name": "users"
}
```

**Output (Text)**:
```text
Table: public.users (table)
  Comment: User account table
--------------------------------------------------
  - id: integer NOT NULL [PK] (Default: nextval('users_id_seq')) (Extra: auto_increment)
  - email: varchar(255) NOT NULL -- User email address
  - created_at: timestamp NOT NULL (Default: CURRENT_TIMESTAMP)
  - status: varchar(50) (Default: 'active')
```

## Internal API Contract

**Endpoint**: `GET /api/v1/metadata/{db_name}`

**Response (JSON)**:
```json
{
  "name": "mydb",
  "schemas": ["public"],
  "tables": [
    {
      "schemaName": "public",
      "tableName": "users",
      "tableType": "table",
      "comment": "User account table",
      "columns": [
        {
          "name": "id",
          "dataType": "integer",
          "isNullable": false,
          "isPrimaryKey": true,
          "defaultValue": "nextval('users_id_seq')",
          "comment": null,
          "extra": "auto_increment"
        }
      ]
    }
  ]
}
```
