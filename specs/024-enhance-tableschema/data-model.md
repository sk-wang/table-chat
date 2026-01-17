# Data Model: Enhance Table Schema Tool

## Backend Entities (`backend/app/models/metadata.py`)

### ColumnInfo (Modified)

Updates the existing `ColumnInfo` model to include `extra` field.

```python
class ColumnInfo(CamelModel):
    name: str = Field(..., description="Column name")
    data_type: str = Field(..., description="Data type")
    is_nullable: bool = Field(True, description="Allows NULL")
    is_primary_key: bool = Field(False, description="Is Primary Key")
    default_value: str | None = Field(None, description="Default value")
    comment: str | None = Field(None, description="Column comment")
    # NEW FIELD
    extra: str | None = Field(None, description="Special attributes (e.g., auto_increment, identity)")
```

## Frontend Types (`frontend/src/types/metadata.ts`)

### ColumnInfo (Modified)

Updates the TypeScript interface to match backend.

```typescript
export interface ColumnInfo {
    name: string;
    dataType: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    defaultValue?: string | null;
    comment?: string | null;
    // NEW FIELD
    extra?: string | null;
}
```

## API Response Structure

The `get_table_schema` tool (for Agent) returns a string, but the underlying API used by frontend (`/api/v1/metadata/{db_name}`) returns `DatabaseMetadata`.

### Agent Tool Output Format (String)

The `get_table_schema` tool will produce text output in this format:

```text
Table: public.users (table)
  Comment: User account table
--------------------------------------------------
  - id: integer NOT NULL [PK] (Default: nextval('users_id_seq')) (Extra: auto_increment)
  - email: varchar(255) NOT NULL -- User email address
  - created_at: timestamp NOT NULL (Default: CURRENT_TIMESTAMP)
  - status: varchar(50) (Default: 'active')
```

## Database Mapping

| Field | PostgreSQL Source | MySQL Source | SQLite Source |
|-------|-------------------|--------------|---------------|
| `extra` | `is_identity` / `identity_generation` from `information_schema.columns` | `EXTRA` from `INFORMATION_SCHEMA.COLUMNS` | Parsed from `PRAGMA table_info` or `sqlite_master` |
