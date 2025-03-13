import { Connection, Request, ConnectionConfig, TYPES } from 'tedious';

// Define interfaces for table and column metadata
export interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyMetadata[];
}

export interface ColumnMetadata {
  name: string;
  dataType: string;
  isNullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isIdentity?: number; // 1 for identity columns, 0 for non-identity columns
}

export interface ForeignKeyMetadata {
  name: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

// Database connection configuration
const getDbConfig = (): ConnectionConfig => {
  return {
    server: process.env.DB_HOST || '',
    authentication: {
      type: 'default',
      options: {
        userName: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
      },
    },
    options: {
      port: parseInt(process.env.DB_PORT || '1433', 10),
      database: process.env.DB_NAME || '',
      encrypt: true,
      trustServerCertificate: true, // For development only, should be false in production
      rowCollectionOnRequestCompletion: true,
    },
  };
};

// Create a database connection
export const createConnection = (): Promise<Connection> => {
  return new Promise((resolve, reject) => {
    try {
      // Log connection config (excluding sensitive info)
      const config = getDbConfig();
      console.log('Connecting to database:', {
        server: config.server,
        database: config.options.database,
        port: config.options.port,
        encrypt: config.options.encrypt
      });
      
      const connection = new Connection(config);
      
      connection.on('connect', (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
        } else {
          console.log('Connected to database successfully');
          resolve(connection);
        }
      });
      
      connection.on('error', (err) => {
        console.error('Database connection error event:', err);
        reject(err);
      });
      
      connection.on('errorMessage', (err) => {
        console.error('Database error message:', err);
      });
      
      connection.on('debug', (message) => {
        console.log('Database debug:', message);
      });
      
      // Add timeout to prevent hanging connections
      setTimeout(() => {
        if (connection.state.name !== 'LoggedIn') {
          console.error('Database connection timeout after 10 seconds');
          reject(new Error('Database connection timeout after 10 seconds'));
        }
      }, 10000);
      
      connection.connect();
    } catch (error) {
      console.error('Error creating database connection:', error);
      reject(error);
    }
  });
};

// Parameter type information
interface ParamTypeInfo {
  type: typeof TYPES[keyof typeof TYPES]; // Using tedious TYPES
  typeName: string; // SQL Server type name
}

// Execute a query and return results as an array of objects
export const executeQuery = async (
  connection: Connection, 
  query: string, 
  params: any[] = [], 
  paramTypes?: ParamTypeInfo[]
): Promise<any[]> => {
  try {
    console.log(`Executing query: ${query.slice(0, 100)}${query.length > 100 ? '...' : ''}`);
    
    // Make sure the connection is in the LoggedIn state before executing the query
    if (connection.state.name !== 'LoggedIn') {
      console.log(`Connection state is ${connection.state.name}, waiting for LoggedIn state...`);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout waiting for LoggedIn state. Current state: ${connection.state.name}`));
        }, 15000); // 15 seconds timeout
        
        const checkState = () => {
          if (connection.state.name === 'LoggedIn') {
            console.log('Connection is now in LoggedIn state');
            clearTimeout(timeout);
            resolve();
          } else if (connection.state.name === 'Final') {
            clearTimeout(timeout);
            reject(new Error('Connection closed before reaching LoggedIn state'));
          } else {
            console.log(`Waiting for connection state to change from ${connection.state.name} to LoggedIn`);
            setTimeout(checkState, 100);
          }
        };
        
        checkState();
      });
    }
    
    return new Promise((resolve, reject) => {
      try {
        const request = new Request(query, (err, rowCount, rows) => {
          if (err) {
            console.error('Query error:', err);
            reject(err);
            return;
          }
          
          console.log(`Query completed successfully. Row count: ${rowCount}`);
          
          // Convert the tedious row format to plain objects
          try {
            const results = rows ? rows.map(row => {
              const result: Record<string, any> = {};
              row.forEach(column => {
                result[column.metadata.colName] = column.value;
              });
              return result;
            }) : [];
            
            resolve(results);
          } catch (conversionError) {
            console.error('Error converting query results:', conversionError);
            reject(conversionError);
          }
        });
        
        // Add parameters to the request if any
        if (params && params.length > 0) {
          // There should be a matching number of parameters and types if provided
          params.forEach((param, index) => {
            // Get the parameter type info if available
            const paramType = paramTypes && paramTypes[index] ? paramTypes[index] : null;
            
            // Handle different parameter types appropriately
            if (param === null || param === undefined) {
              // Use the specified type for null values, or default to NVarChar
              request.addParameter(`param${index}`, paramType?.type || TYPES.NVarChar, null);
            } else if (typeof param === 'number') {
              if (Number.isInteger(param)) {
                request.addParameter(`param${index}`, TYPES.Int, param);
              } else {
                request.addParameter(`param${index}`, TYPES.Float, param);
              }
            } else if (typeof param === 'boolean') {
              request.addParameter(`param${index}`, TYPES.Bit, param);
            } else if (param instanceof Date) {
              request.addParameter(`param${index}`, TYPES.DateTime, param);
            } else if (typeof param === 'string') {
              if (paramType?.typeName === 'image' || paramType?.typeName === 'varbinary') {
                // Handle binary data - convert to Buffer if possible
                try {
                  // For base64 encoded strings
                  if (param.startsWith('data:') && param.includes(';base64,')) {
                    const base64Data = param.split(';base64,')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    request.addParameter(`param${index}`, TYPES.VarBinary, buffer);
                  } else {
                    // Skip binary fields that don't have valid data
                    console.log(`Skipping binary field param${index} - not a valid base64 string`);
                    request.addParameter(`param${index}`, TYPES.VarBinary, null);
                  }
                } catch (error) {
                  console.error(`Error processing binary data for param${index}:`, error);
                  request.addParameter(`param${index}`, TYPES.VarBinary, null);
                }
              } else if (param.length > 4000) {
                request.addParameter(`param${index}`, TYPES.NText, param);
              } else {
                request.addParameter(`param${index}`, TYPES.NVarChar, param);
              }
            } else {
              // Convert to string for any other type, unless it's binary
              if (paramType?.typeName === 'image' || paramType?.typeName === 'varbinary') {
                console.log(`Skipping binary field param${index} - unexpected type`);
                request.addParameter(`param${index}`, TYPES.VarBinary, null);
              } else {
                request.addParameter(`param${index}`, TYPES.NVarChar, String(param));
              }
            }
          });
        }
        
        // Add event handlers for the request
        request.on('done', () => {
          console.log('Request done event');
        });
        
        request.on('error', (err) => {
          console.error('Request error event:', err);
          reject(err);
        });
        
        // Execute the SQL request
        connection.execSql(request);
      } catch (requestError) {
        console.error('Error creating request:', requestError);
        reject(requestError);
      }
    });
  } catch (error) {
    console.error('Error in executeQuery:', error);
    throw error;
  }
};

// Get all tables in the database
export const getAllTables = async (connection: Connection): Promise<string[]> => {
  const query = `
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo'
    ORDER BY TABLE_NAME
  `;
  
  const results = await executeQuery(connection, query);
  return results.map(row => row.TABLE_NAME);
};

// Get table metadata including columns, primary keys, and foreign keys
export const getTableMetadata = async (connection: Connection, tableName: string): Promise<TableMetadata> => {
  // Get columns with identity information
  const columnsQuery = `
    SELECT 
      c.COLUMN_NAME as name,
      c.DATA_TYPE as dataType,
      CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END as isNullable,
      c.CHARACTER_MAXIMUM_LENGTH as maxLength,
      c.NUMERIC_PRECISION as precision,
      c.NUMERIC_SCALE as scale,
      COLUMNPROPERTY(OBJECT_ID('${tableName}'), c.COLUMN_NAME, 'IsIdentity') as isIdentity
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_NAME = '${tableName}'
    ORDER BY c.ORDINAL_POSITION
  `;
  
  // Get primary keys
  const primaryKeysQuery = `
    SELECT kcu.COLUMN_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      AND tc.TABLE_NAME = '${tableName}'
  `;
  
  // Get foreign keys
  const foreignKeysQuery = `
    SELECT 
      tc.CONSTRAINT_NAME as name,
      kcu.COLUMN_NAME as columnName,
      ccu.TABLE_NAME as referencedTable,
      ccu.COLUMN_NAME as referencedColumn
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
    JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
      ON rc.UNIQUE_CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND tc.TABLE_NAME = '${tableName}'
  `;
  
  // Execute all queries
  const [columns, primaryKeys, foreignKeys] = await Promise.all([
    executeQuery(connection, columnsQuery),
    executeQuery(connection, primaryKeysQuery),
    executeQuery(connection, foreignKeysQuery)
  ]);
  
  return {
    name: tableName,
    columns: columns,
    primaryKeys: primaryKeys.map(pk => pk.COLUMN_NAME),
    foreignKeys: foreignKeys
  };
};

// Get table data with pagination
export const getTableData = async (
  connection: Connection, 
  tableName: string, 
  page: number = 1, 
  pageSize: number = 50, 
  orderBy: string = '', 
  orderDirection: 'ASC' | 'DESC' = 'ASC',
  filter: string = ''
): Promise<{ data: any[], total: number }> => {
  try {
    console.log(`Fetching data for table: ${tableName}`);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) AS total FROM [${tableName}]`;
    if (filter) {
      countQuery += ` WHERE ${filter}`;
    }
    
    console.log('Count query:', countQuery);
    console.log('Executing count query...');
    const countResult = await executeQuery(connection, countQuery);
    console.log('Count result:', countResult);
    
    const total = countResult && countResult[0] ? countResult[0].total : 0;
    
    // Try modern pagination first (SQL Server 2012+)
    try {
      // Build data query with OFFSET/FETCH pagination (SQL Server 2012+)
      let dataQuery = `
        SELECT * FROM [${tableName}]
      `;
      
      if (filter) {
        dataQuery += ` WHERE ${filter}`;
      }
      
      if (orderBy) {
        dataQuery += ` ORDER BY [${orderBy}] ${orderDirection}`;
      } else {
        // Add a default ORDER BY clause - required for OFFSET/FETCH
        dataQuery += ` ORDER BY (SELECT NULL)`;
      }
      
      dataQuery += `
        OFFSET ${(page - 1) * pageSize} ROWS
        FETCH NEXT ${pageSize} ROWS ONLY
      `;
      
      console.log('Data query (modern pagination):', dataQuery);
      console.log('Executing data query...');
      const data = await executeQuery(connection, dataQuery);
      console.log(`Data query returned ${data.length} rows`);
      
      return {
        data: data || [],
        total: total
      };
    } catch (modernError) {
      // If modern pagination fails, try legacy pagination (SQL Server 2008 and earlier)
      console.warn('Modern pagination failed, trying legacy pagination:', modernError);
      
      let legacyQuery = `
        WITH NumberedRows AS (
          SELECT 
            ROW_NUMBER() OVER (${orderBy ? `ORDER BY [${orderBy}] ${orderDirection}` : 'ORDER BY (SELECT NULL)'}) AS RowNum,
            *
          FROM [${tableName}]
          ${filter ? `WHERE ${filter}` : ''}
        )
        SELECT * FROM NumberedRows
        WHERE RowNum BETWEEN ${(page - 1) * pageSize + 1} AND ${page * pageSize}
      `;
      
      console.log('Data query (legacy pagination):', legacyQuery);
      console.log('Executing legacy data query...');
      const legacyData = await executeQuery(connection, legacyQuery);
      console.log(`Legacy data query returned ${legacyData.length} rows`);
      
      return {
        data: legacyData || [],
        total: total
      };
    }
  } catch (error) {
    console.error(`Error in getTableData for table ${tableName}:`, error);
    throw error;
  }
};

// Insert a new record
export const insertRecord = async (connection: Connection, tableName: string, data: Record<string, any>): Promise<void> => {
  try {
    // First, get table metadata to identify identity columns
    console.log(`Getting metadata for table ${tableName} to identify identity columns`);
    const tableMetadata = await getTableMetadata(connection, tableName);
    
    // Get a list of identity column names to exclude from insert
    const identityColumns = tableMetadata.columns
      .filter(col => col.isIdentity === 1)
      .map(col => col.name);
    
    console.log(`Identity columns in ${tableName}:`, identityColumns);
    
    // Get column data types
    const columnDataTypes = new Map<string, string>();
    tableMetadata.columns.forEach(col => {
      columnDataTypes.set(col.name, col.dataType.toLowerCase());
    });
    
    // Filter out identity columns and nulls from the data
    const filteredData: Record<string, any> = {};
    const paramTypes: ParamTypeInfo[] = [];
    
    Object.keys(data).forEach(key => {
      // Skip identity columns and null values for required columns
      if (!identityColumns.includes(key) && (data[key] !== null || isNullableColumn(key, tableMetadata))) {
        filteredData[key] = data[key];
        
        // Add type information
        const typeName = columnDataTypes.get(key) || 'nvarchar';
        paramTypes.push({
          type: getTypeFromSqlType(typeName),
          typeName: typeName
        });
      }
    });
    
    // Ensure we have data to insert after filtering
    if (Object.keys(filteredData).length === 0) {
      console.warn(`No insertable data found for table ${tableName} after filtering identity columns`);
      return;
    }
    
    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
    
    const query = `
      INSERT INTO [${tableName}] (${columns.map(c => `[${c}]`).join(', ')})
      VALUES (${columns.map((_, i) => `@param${i}`).join(', ')})
    `;
    
    await executeQuery(connection, query, values, paramTypes);
  } catch (error) {
    console.error(`Error in insertRecord for table ${tableName}:`, error);
    throw error;
  }
};

// Helper function to check if a column is nullable
function isNullableColumn(columnName: string, tableMetadata: TableMetadata): boolean {
  const column = tableMetadata.columns.find(col => col.name === columnName);
  return column ? column.isNullable : false;
}

// Convert SQL Server type name to tedious TYPES
function getTypeFromSqlType(sqlType: string): typeof TYPES[keyof typeof TYPES] {
  // Normalize the type name to lowercase
  sqlType = sqlType.toLowerCase();
  
  // Map SQL Server types to tedious TYPES
  if (sqlType.includes('char') || sqlType.includes('text')) {
    if (sqlType.includes('nvarchar') || sqlType.includes('nchar') || sqlType.includes('ntext')) {
      return sqlType.includes('max') ? TYPES.NText : TYPES.NVarChar;
    } else {
      return sqlType.includes('max') ? TYPES.Text : TYPES.VarChar;
    }
  } else if (sqlType === 'bit') {
    return TYPES.Bit;
  } else if (sqlType.includes('int')) {
    return TYPES.Int;
  } else if (sqlType === 'bigint') {
    return TYPES.BigInt;
  } else if (sqlType === 'smallint') {
    return TYPES.SmallInt;
  } else if (sqlType === 'tinyint') {
    return TYPES.TinyInt;
  } else if (sqlType === 'float' || sqlType === 'real') {
    return TYPES.Float;
  } else if (sqlType === 'decimal' || sqlType === 'numeric' || sqlType === 'money' || sqlType === 'smallmoney') {
    return TYPES.Decimal;
  } else if (sqlType.includes('date')) {
    if (sqlType === 'date') {
      return TYPES.Date;
    } else if (sqlType === 'datetime' || sqlType === 'datetime2') {
      return TYPES.DateTime2;
    } else if (sqlType === 'datetimeoffset') {
      return TYPES.DateTimeOffset;
    } else if (sqlType === 'smalldatetime') {
      return TYPES.SmallDateTime;
    }
  } else if (sqlType.includes('time')) {
    return TYPES.Time;
  } else if (sqlType === 'uniqueidentifier') {
    return TYPES.UniqueIdentifier;
  } else if (sqlType === 'xml') {
    return TYPES.Xml;
  } else if (sqlType === 'image' || sqlType === 'binary' || sqlType === 'varbinary') {
    return sqlType === 'image' ? TYPES.Image : TYPES.VarBinary;
  }
  
  // Default to NVarChar for unknown types
  console.warn(`Unrecognized SQL type: ${sqlType}, defaulting to NVarChar`);
  return TYPES.NVarChar;
}

// Update a record
export const updateRecord = async (
  connection: Connection, 
  tableName: string, 
  data: Record<string, any>, 
  whereCondition: string
): Promise<void> => {
  try {
    // First, get table metadata to identify identity columns
    console.log(`Getting metadata for table ${tableName} to identify identity columns`);
    const tableMetadata = await getTableMetadata(connection, tableName);
    
    // Get a list of identity column names to exclude from update
    const identityColumns = tableMetadata.columns
      .filter(col => col.isIdentity === 1)
      .map(col => col.name);
    
    console.log(`Identity columns in ${tableName}:`, identityColumns);
    
    // Get column data types
    const columnDataTypes = new Map<string, string>();
    tableMetadata.columns.forEach(col => {
      columnDataTypes.set(col.name, col.dataType.toLowerCase());
    });
    
    // Filter out identity columns from the data
    const filteredData: Record<string, any> = {};
    const filteredValues: any[] = [];
    const paramTypes: ParamTypeInfo[] = [];
    
    Object.keys(data).forEach(key => {
      if (!identityColumns.includes(key)) {
        filteredData[key] = data[key];
        filteredValues.push(data[key]);
        
        // Add type information
        const typeName = columnDataTypes.get(key) || 'nvarchar';
        paramTypes.push({
          type: getTypeFromSqlType(typeName),
          typeName: typeName
        });
      }
    });
    
    // Ensure we have data to update after filtering
    if (Object.keys(filteredData).length === 0) {
      console.warn(`No updatable columns found for table ${tableName} after filtering identity columns`);
      return;
    }
    
    // Build the SET clause for the update query
    const setClause = Object.keys(filteredData)
      .map((key, i) => `[${key}] = @param${i}`)
      .join(', ');
    
    const query = `
      UPDATE [${tableName}]
      SET ${setClause}
      WHERE ${whereCondition}
    `;
    
    await executeQuery(connection, query, filteredValues, paramTypes);
  } catch (error) {
    console.error(`Error in updateRecord for table ${tableName}:`, error);
    throw error;
  }
};

// Delete a record
export const deleteRecord = async (
  connection: Connection, 
  tableName: string, 
  whereCondition: string
): Promise<void> => {
  const query = `
    DELETE FROM [${tableName}]
    WHERE ${whereCondition}
  `;
  
  await executeQuery(connection, query);
};