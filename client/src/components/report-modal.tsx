import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: any[];
}

export function ReportModal({ open, onOpenChange, employees }: ReportModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employeeId: "",
    month: new Date().toISOString().slice(0, 7),
    startDate: "",
    endDate: "",
  });

  const handleGenerateReport = () => {
    if (!formData.employeeId || !formData.startDate || !formData.endDate || !formData.month) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione um funcionário, o mês de referência e o período completo.",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      toast({
        title: "Intervalo de datas inválido",
        description: "A data final não pode ser anterior à data inicial.",
        variant: "destructive",
      });
      return;
    }

    if (differenceInDays(end, start) > 31) {
      toast({
        title: "Intervalo de datas inválido",
        description: "O período selecionado não pode ser maior que 31 dias.",
        variant: "destructive",
      });
      return;
    }

    const url = `/api/manager/report/monthly?userId=${formData.employeeId}&month=${formData.month}&startDate=${formData.startDate}&endDate=${formData.endDate}`;
    window.open(url, '_blank');
    onOpenChange(false);
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    return options;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerar Relatório de Fechamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Funcionário</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mês de Referência (para o título)</Label>
              <Select
                value={formData.month}
                onValueChange={(value) => setFormData({ ...formData, month: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Período do Relatório</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
               <div>
                 <Label htmlFor="start-date" className="text-sm text-muted-foreground">Data de Início</Label>
                 <Input
                   id="start-date"
                   type="date"
                   value={formData.startDate}
                   onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                 />
               </div>
               <div>
                 <Label htmlFor="end-date" className="text-sm text-muted-foreground">Data de Fim</Label>
                 <Input
                   id="end-date"
                   type="date"
                   value={formData.endDate}
                   onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                 />
               </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleGenerateReport}>
            <Download className="h-4 w-4 mr-2" />
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}