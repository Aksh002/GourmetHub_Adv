import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TableWithOrder } from '@shared/schema';
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/layouts/admin-layout";

interface FloorTables {
  floorNumber: number;
  tables: TableWithOrder[];
}

export default function TempTablesPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user } = useAuth();
  const [floors, setFloors] = useState<FloorTables[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTables() {
      if (!restaurantId) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch tables for each floor (assuming max 3 floors for now)
        const floorPromises = [1, 2, 3].map(async (floorNumber) => {
          const response = await fetch(`/api/tables-by-floor?restaurantId=${restaurantId}&floorNumber=${floorNumber}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch tables for floor ${floorNumber}`);
          }

          const tables = await response.json();
          return { floorNumber, tables };
        });

        const results = await Promise.all(floorPromises);
        setFloors(results.filter(floor => floor.tables.length > 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tables');
      } finally {
        setLoading(false);
      }
    }

    fetchTables();
  }, [restaurantId]);

  if (loading) return <div>Loading tables...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Restaurant Tables</h1>
        <div className="space-y-6">
          {floors.map(({ floorNumber, tables }) => (
            <div key={floorNumber} className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Floor {floorNumber}</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-12 md:grid-cols-16 lg:grid-cols-20 gap-1">
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className={`w-6 h-6 border rounded flex flex-col items-center justify-center ${
                        table.order ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="font-medium text-[8px] leading-none">T{table.tableNumber}</div>
                      <span className={`block w-1 h-1 rounded-full mt-0.5 ${
                        table.order ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
} 