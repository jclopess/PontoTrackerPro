import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit } from "lucide-react";
import { type TimeRecord, type Justification } from "@shared/schema";

interface EmployeeTableProps {
  employees: any[];
  timeRecords: any[];
  justifications: Justification[];
  selectedDate: string;
  onEditRecord: (record: Partial<TimeRecord>) => void;
}

export function EmployeeTable({ employees, timeRecords, justifications, selectedDate, onEditRecord }: EmployeeTableProps) {
  const getEmployeeRecord = (employeeId: number) => {
    return timeRecords.find((record) => record.userId === employeeId);
  };

  const getEmployeeJustification = (employeeId: number) => {
    return justifications.find(j => j.userId === employeeId);
  };

  const getStatusBadge = (record: any, justification: any) => {
    if (justification) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Justificado</Badge>;
    }
    if (!record || !record.entry1) {
      return <Badge variant="secondary">Ausente</Badge>;
    }
    if (record.entry1 && record.exit1 && record.entry2 && record.exit2) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completo</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Presente</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Entrada 1</TableHead>
            <TableHead>Saída 1</TableHead>
            <TableHead>Entrada 2</TableHead>
            <TableHead>Saída 2</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const record = getEmployeeRecord(employee.id);
            const justification = getEmployeeJustification(employee.id);
            const canEdit = record || justification;

            return (
              <TableRow key={employee.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-white">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                      <div className="text-sm text-gray-500">
                        {employee.department ? employee.department.name : "Sem departamento"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-900">{record?.entry1 || "--:--"}</TableCell>
                <TableCell className="text-sm text-gray-900">{record?.exit1 || "--:--"}</TableCell>
                <TableCell className="text-sm text-gray-900">{record?.entry2 || "--:--"}</TableCell>
                <TableCell className="text-sm text-gray-900">{record?.exit2 || "--:--"}</TableCell>
                <TableCell>{getStatusBadge(record, justification)}</TableCell>
                <TableCell className="text-right">
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEditRecord(record || { userId: employee.id, date: selectedDate })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}