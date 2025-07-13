import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, QrCode } from "lucide-react";

interface TableData {
  id: number;
  tableNumber: number;
  floorNumber: number;
  qrCodeUrl: string;
  status: string;
}

export default function TablesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);

  // Fetch tables
  const { data: tables, isLoading } = useQuery<TableData[]>({
    queryKey: ["tables", user?.restaurantId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/tables?restaurantId=${user?.restaurantId}`
      );
      return res.json();
    },
    enabled: !!user?.restaurantId,
  });

  // Function to download QR code
  const downloadQR = (table: TableData) => {
    // Convert base64 to blob
    const byteString = atob(table.qrCodeUrl.split(',')[1]);
    const mimeString = table.qrCodeUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `table-${table.tableNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({
      title: "QR Code Downloaded",
      description: `QR code for Table ${table.tableNumber} has been downloaded.`,
    });
  };

  if (isLoading) {
    return <div>Loading tables...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Restaurant Tables</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table Number</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>QR Code</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables?.map((table) => (
              <TableRow key={table.id}>
                <TableCell>Table {table.tableNumber}</TableCell>
                <TableCell>Floor {table.floorNumber}</TableCell>
                <TableCell>
                  <span className={`capitalize ${
                    table.status === 'available' ? 'text-green-600' :
                    table.status === 'occupied' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {table.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      Scan to access table
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQR(table)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download QR
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 