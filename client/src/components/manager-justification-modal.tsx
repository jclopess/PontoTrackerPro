import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ManagerJustificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: any[]; // Lista de funcionários para selecionar
  onSuccess: () => void; // Para recarregar dados
}

export function ManagerJustificationModal({ open, onOpenChange, employees, onSuccess }: ManagerJustificationModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    userId: "",
    date: "",
    type: "",
    reason: "",
  });
  const [forAllEmployees, setForAllEmployees] = useState(false);

  // Limpa o formulário quando o modal é fechado
  useEffect(() => {
    if (!open) {
      setFormData({ userId: "", date: "", type: "", reason: "" });
      setForAllEmployees(false);
    }
  }, [open]);

  const createJustificationMutation = useMutation({
    mutationFn: (data: any) => {
      if (forAllEmployees) {
        return apiRequest("POST", "/api/manager/justifications/bulk", data);
      }
      return apiRequest("POST", "/api/manager/justifications", data);
    },
    onSuccess: () => {
      toast({ title: "Justificativa(s) criada(s) com sucesso!" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar justificativa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!formData.userId && !forAllEmployees) || !formData.date || !formData.type || !formData.reason) {
      toast({ title: "Erro", description: "Todos os campos são obrigatórios.", variant: "destructive" });
      return;
    }
    
    let submissionData: any = {
      date: formData.date,
      type: formData.type,
      reason: formData.reason,
    };

    if (forAllEmployees) {
      submissionData.userIds = employees.map(e => e.id);
    } else {
      submissionData.userId = formData.userId;
    }

    createJustificationMutation.mutate(submissionData);
  };

  // Fetch justification types from API
  const { data: justificationTypes, isLoading: isLoadingTypes, isError: isErrorTypes } = useQuery({
    queryKey: ["/api/justification-types"],
    queryFn: () => apiRequest("GET", "/api/justification-types").then(res => res.json()),
  });

  // Transform API data to match expected format - only active types
  const typeOptions = justificationTypes?.filter((type:any) => type.isActive).map((type:any) => ({
    value: type.name,
    label: type.name,
    description: type.description,
    requiresDocumentation: type.requiresDocumentation
  })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lançar Justificativa para Funcionário</DialogTitle>
          <DialogDescription>
            Use para registrar férias, licenças e outros afastamentos abonados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="for-all-employees"
              checked={forAllEmployees}
              onCheckedChange={(checked) => setForAllEmployees(checked as boolean)}
            />
            <Label htmlFor="for-all-employees">Lançar para todos os funcionários</Label>
          </div>
          <div>
            <Label htmlFor="employee-select">Funcionário</Label>
            <Select
              value={formData.userId}
              onValueChange={(value) => setFormData({ ...formData, userId: value })}
              disabled={forAllEmployees}
            >
              <SelectTrigger id="employee-select">
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
            <Label htmlFor="justification-date">Data do Afastamento</Label>
            <Input
              id="justification-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="justification-type">Tipo de Justificativa</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="justification-type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTypes ? (
                  <SelectItem disabled value="loading">Carregando...</SelectItem>
                ) : isErrorTypes ? (
                  <SelectItem disabled value="error">Erro ao carregar tipos</SelectItem>
                ) : (
                  typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Error state for API call */}
          {isErrorTypes && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                Não foi possível carregar os tipos de justificativas. Tente recarregar a página.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="justification-reason">Motivo/Descrição</Label>
            <Textarea
              id="justification-reason"
              rows={3}
              placeholder="Ex: Atestado médico de 1 dia"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createJustificationMutation.isPending}>
              {createJustificationMutation.isPending ? "Salvando..." : "Salvar Justificativa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}