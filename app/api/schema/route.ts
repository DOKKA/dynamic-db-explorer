import { NextRequest, NextResponse } from 'next/server';
import { createConnection, getAllTables, getTableMetadata } from '../../services/database';

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    // Create database connection
    connection = await createConnection();
    
    // Get all tables
    const tables = await getAllTables(connection);
    
    // Get metadata for each table - process one at a time to avoid overwhelming the connection
    const tablesWithMetadata = [];
    for (const tableName of tables) {
      try {
        const metadata = await getTableMetadata(connection, tableName);
        tablesWithMetadata.push(metadata);
      } catch (tableError) {
        console.error(`Error fetching metadata for table ${tableName}:`, tableError);
        // Continue with other tables even if one fails
      }
    }
    
    // Return the schema information
    return NextResponse.json({ tables: tablesWithMetadata });
  } catch (error) {
    console.error('Error fetching schema:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database schema' },
      { status: 500 }
    );
  } finally {
    // Ensure connection is closed even if there's an error
    if (connection) {
      try {
        connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}