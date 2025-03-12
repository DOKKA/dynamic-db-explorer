import { NextRequest, NextResponse } from 'next/server';
import { createConnection, getTableData } from '../../../services/database';

// Helper function to get tableName from URL path
const getTableNameFromPath = (path: string): string => {
  const segments = path.split('/');
  const encodedTableName = segments[segments.length - 1].split('?')[0];
  // Decode URL-encoded table name
  return decodeURIComponent(encodedTableName);
};

export async function GET(request: NextRequest) {
  let connection;
  let tableName = '';
  
  try {
    // Extract tableName from URL path
    const url = request.url;
    tableName = getTableNameFromPath(url);
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }
    
    console.log(`Processing request for table: ${tableName}`);
    
    // Create database connection
    connection = await createConnection();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const orderBy = searchParams.get('orderBy') || '';
    const orderDirection = (searchParams.get('orderDirection') || 'ASC') as 'ASC' | 'DESC';
    const filter = searchParams.get('filter') || '';
    
    // Get table data with pagination
    const result = await getTableData(
      connection,
      tableName,
      page,
      pageSize,
      orderBy,
      orderDirection,
      filter
    );
    
    // Return the data
    return NextResponse.json(result);
  } catch (error) {
    // Log detailed error information
    console.error('Error fetching data for table:', tableName);
    console.error('Error details:', error);
    
    // Return error message with more details
    let errorMessage = 'Failed to fetch data';
    
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
      console.error('Error stack:', error.stack);
    }
    
    if (error instanceof AggregateError && error.errors) {
      console.error('Aggregate errors:', error.errors);
      errorMessage = `${errorMessage}: Multiple errors occurred`;
    }
    
    // Provide a fallback response with empty data but correct structure
    // This helps the UI to continue functioning even when there's an error
    return NextResponse.json({
      data: [],
      total: 0,
      error: errorMessage
    }, { status: 500 });
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