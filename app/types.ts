// Define TypeScript interfaces for database schema
export interface ColumnMetadata {
  name: string;
  dataType: string;
  isNullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isIdentity?: number;
}

export interface ForeignKeyMetadata {
  name: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyMetadata[];
}

export interface SchemaResponse {
  tables: TableMetadata[];
}

export interface TableDataResponse {
  data: Record<string, any>[];
  total: number;
}