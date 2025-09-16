import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: any[];
}

export function ReportModal({ open, onOpenChange, employees }: ReportModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employeeId: "", // Inicia sem seleção
    month: new Date().toISOString().slice(0, 7),
    reportType: "summary", // Mantido para futuras implementações
  });

  // --- FUNÇÃO ATUALIZADA ---
  const handleGenerateReport = () => {
    if (!formData.employeeId) {
      toast({
        title: "Seleção necessária",
        description: "Por favor, selecione um funcionário.",
        variant: "destructive",
      });
      return;
    }

    // Constrói a URL para a API
    const url = `/api/manager/report/monthly?userId=${formData.employeeId}&month=${formData.month}`;
    
    // Abre a URL em uma nova aba, o que iniciará o download
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Funcionário</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
              >
                <SelectTrigger>
                  {/* Atualizado para um placeholder */}
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {/* Removida a opção "Todos os funcionários" por enquanto */}
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Período</Label>
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
          {/* O tipo de relatório é mantido para o futuro */}
          <div>
            <Label>Tipo de Relatório</Label>
            <RadioGroup
              value={formData.reportType}
              onValueChange={(value) => setFormData({ ...formData, reportType: value })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="summary" id="summary" />
                <Label htmlFor="summary" className="text-sm">
                  Resumo mensal com banco de horas
                </Label>
              </div>
            </RadioGroup>
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