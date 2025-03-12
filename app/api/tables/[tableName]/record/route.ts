import { NextRequest, NextResponse } from 'next/server';
import { createConnection, insertRecord, updateRecord, deleteRecord } from '../../../../services/database';

// Helper function to get tableName from URL path
const getTableNameFromPath = (path: string): string => {
  const segments = path.split('/');
  // The tableName is two segments before the last segment (which is 'record')
  const encodedTableName = segments[segments.length - 2];
  // Decode URL-encoded table name
  return decodeURIComponent(encodedTableName);
};

export async function POST(request: NextRequest) {
  let connection;
  
  try {
    // Extract tableName from URL path
    const url = request.url;
    const tableName = getTableNameFromPath(url);
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }
    
    // Create database connection
    connection = await createConnection();
    
    // Get request body (new record data)
    const data = await request.json();
    
    // Insert the record
    await insertRecord(connection, tableName, data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { error: 'Failed to create record' },
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

export async function PUT(request: NextRequest) {
  let connection;
  
  try {
    // Extract tableName from URL path
    const url = request.url;
    const tableName = getTableNameFromPath(url);
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }
    
    // Create database connection
    connection = await createConnection();
    
    // Get request body (updated record data and where condition)
    const { data, whereCondition } = await request.json();
    
    if (!whereCondition) {
      return NextResponse.json(
        { error: 'Where condition is required for update' },
        { status: 400 }
      );
    }
    
    // Update the record
    await updateRecord(connection, tableName, data, whereCondition);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Failed to update record' },
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

export async function DELETE(request: NextRequest) {
  let connection;
  
  try {
    // Extract tableName from URL path
    const url = request.url;
    const tableName = getTableNameFromPath(url);
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }
    
    // Create database connection
    connection = await createConnection();
    
    // Get the where condition from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const whereCondition = searchParams.get('where');
    
    if (!whereCondition) {
      return NextResponse.json(
        { error: 'Where condition is required for delete' },
        { status: 400 }
      );
    }
    
    // Delete the record
    await deleteRecord(connection, tableName, whereCondition);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { error: 'Failed to delete record' },
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