# Dynamic DB Explorer

A powerful, zero-configuration database exploration tool for Microsoft SQL Server. This application automatically discovers your database schema and provides an intuitive interface for browsing and editing data across all your tables.

![Dynamic DB Explorer Screenshot](https://via.placeholder.com/800x450)

## Features

- **Automatic Schema Discovery**: Connects to your SQL Server database and uses `INFORMATION_SCHEMA` to dynamically discover all tables and relationships.
- **Interactive Navigation**: Browse your entire database through a clean sidebar that lists all available tables.
- **Master/Detail View**: View and interact with your data through a responsive grid for records overview and a detail form for individual record management.
- **Dynamic Form Generation**: Forms are automatically generated based on table schema, with proper input controls for each data type.
- **Relationship Visualization**: Displays foreign key relationships between tables with intuitive navigation.
- **Modern React Architecture**: Built with Next.js 15 and React 19 for optimal performance and developer experience.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- Access to a Microsoft SQL Server database
- SQL Server credentials with appropriate permissions

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/dynamic-db-explorer.git
   cd dynamic-db-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root with your database connection information:
   ```
   DB_SERVER=your-server.database.windows.net
   DB_NAME=your-database
   DB_USER=your-username
   DB_PASSWORD=your-password
   DB_PORT=1433
   DB_ENCRYPT=true
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Connect to Database**: When you first open the application, it will attempt to connect to your database using the credentials provided in the `.env.local` file.

2. **Navigate Tables**: The sidebar displays all tables in your database. Click on any table name to select it.

3. **Browse Data**: The top section shows a paginated grid view of all records in the selected table.
   - Sort by clicking on column headers
   - Filter using the search box above the grid
   - Navigate through pages using the pagination controls

4. **Edit Records**: The bottom section displays a form for the currently selected record:
   - Select a record in the grid to edit it
   - Click "New" to create a new record
   - All fields are automatically validated based on the database schema
   - Foreign key fields are presented as dropdowns with related values

5. **Save Changes**: Click "Save" to commit changes to the database, or "Cancel" to discard them.

## How It Works

### Schema Discovery

The application uses the `tedious` library to connect to SQL Server and queries the `INFORMATION_SCHEMA` views to discover:

- Tables and their columns (`INFORMATION_SCHEMA.TABLES` and `INFORMATION_SCHEMA.COLUMNS`)
- Primary keys (`INFORMATION_SCHEMA.TABLE_CONSTRAINTS` and `INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE`)
- Foreign key relationships (`INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS`)

This metadata is then used to dynamically build the UI components and establish relationships between tables.

### UI Components

- **Sidebar**: Generated from the list of tables in the database
- **Data Grid**: Dynamically renders columns based on table schema
- **Detail Form**: Automatically generates form fields based on column data types
- **Relationship Navigation**: Allows jumping to related records in other tables

### Data Flow

1. User selects a table from the sidebar
2. Application queries the selected table for data
3. Grid view is populated with results
4. When a record is selected, the form is populated with that record's data
5. Changes made in the form are validated against the schema
6. On save, changes are committed back to the database

## Configuration Options

Advanced configuration options can be set in a `config.json` file:

```json
{
  "recordsPerPage": 50,
  "defaultSort": "id",
  "defaultSortDirection": "asc",
  "showSystemTables": false,
  "dateFormat": "MM/DD/YYYY",
  "theme": "light"
}
```

## Limitations

- Currently supports Microsoft SQL Server only
- Tables must have a primary key for edit functionality
- Large result sets may impact performance
- Some advanced SQL Server features (spatial types, XML, etc.) have limited support


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.