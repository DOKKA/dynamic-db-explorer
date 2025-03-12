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

// Execute a query and return results as an array of objects
export const executeQuery = async (connection: Connection, query: string, params: any[] = []): Promise<any[]> => {
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
          params.forEach((param, index) => {
            // Note: This is simplified. In a real app, you would need to specify the proper TYPES
            request.addParameter(`param${index}`, TYPES.VarChar, param);
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
  // Get columns
  const columnsQuery = `
    SELECT 
      COLUMN_NAME as name,
      DATA_TYPE as dataType,
      CASE WHEN IS_NULLABLE = 'YES' THEN 1 ELSE 0 END as isNullable,
      CHARACTER_MAXIMUM_LENGTH as maxLength,
      NUMERIC_PRECISION as precision,
      NUMERIC_SCALE as scale
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${tableName}'
    ORDER BY ORDINAL_POSITION
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
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  const query = `
    INSERT INTO [${tableName}] (${columns.map(c => `[${c}]`).join(', ')})
    VALUES (${columns.map((_, i) => `@param${i}`).join(', ')})
  `;
  
  await executeQuery(connection, query, values);
};

// Update a record
export const updateRecord = async (
  connection: Connection, 
  tableName: string, 
  data: Record<string, any>, 
  whereCondition: string
): Promise<void> => {
  const setClause = Object.keys(data)
    .map((key, i) => `[${key}] = @param${i}`)
    .join(', ');
  
  const query = `
    UPDATE [${tableName}]
    SET ${setClause}
    WHERE ${whereCondition}
  `;
  
  await executeQuery(connection, query, Object.values(data));
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