import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JustificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JustificationModal({ open, onOpenChange }: JustificationModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: "",
    type: "",
    reason: "",
    recordToAdjust: "",
  });

  const { data: justificationTypes, isLoading: isLoadingTypes, isError: isErrorTypes } = useQuery({
    queryKey: ["/api/justification-types"],
    queryFn: () => apiRequest("GET", "/api/justification-types").then(res => res.json()),
  });

  const selectedType = justificationTypes?.find(type => type.name === formData.type);
  const needsProof = selectedType?.requiresDocumentation || false;
  const mightNeedMoreInfo = formData.type !== "" && !needsProof && !selectedType?.requiresRecordSelection;

  useEffect(() => {
    if (!open) {
      setFormData({ date: "", type: "", reason: "", recordToAdjust: "" });
    }
  }, [open]);

  const submitJustificationMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/justifications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/justifications"] });
      toast({
        title: "Justificativa enviada",
        description: "Sua justificativa foi enviada para aprovação.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.type || !formData.reason) {
      toast({ title: "Erro", description: "Todos os campos são obrigatórios.", variant: "destructive" });
      return;
    }
    if (selectedType && selectedType.requiresRecordSelection && !formData.recordToAdjust) {
      toast({ title: "Erro", description: "Por favor, selecione qual registro deve ser ajustado.", variant: "destructive" });
      return;
    }
    submitJustificationMutation.mutate(formData);
  };

  const typeOptions = justificationTypes?.filter(type => type.isActive).map(type => ({
    value: type.name,
    label: type.name,
    description: type.description,
    requiresDocumentation: type.requiresDocumentation
  })) || [];
  
  const recordOptions = [
      { value: "entry1", label: "Entrada 1" },
      { value: "exit1", label: "Saída 1" },
      { value: "entry2", label: "Entrada 2" },
      { value: "exit2", label: "Saída 2" },
      { value: "all", label: "Todas as marcações do dia" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Justificativa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="justification-date">Data</Label>
            <Input
              id="justification-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="justification-type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value, recordToAdjust: "" })}
            >
              <SelectTrigger>
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

          {/* Special handling for record adjustment types - schema-driven */}
          {selectedType && selectedType.requiresRecordSelection && (
            <div>
              <Label htmlFor="record-to-adjust">Registro para Ajustar</Label>
              <Select
                value={formData.recordToAdjust}
                onValueChange={(value) => setFormData({ ...formData, recordToAdjust: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o registro" />
                </SelectTrigger>
                <SelectContent>
                  {recordOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="justification-reason">Motivo</Label>
            <Textarea
              id="justification-reason"
              rows={3}
              placeholder={
                selectedType?.requiresRecordSelection
                  ? "Informe o horário de registro para a marcação escolhida. Ex: 07:30 ou 14:40."
                  : "Descreva o motivo da justificativa..."
              }
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>
          {/* Aviso Informativo para as opções de Problemas de Saúde e Treinamento*/}
          {needsProof && (            
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                    Este tipo de justificativa requer a apresentação de um comprovante físico (ex: atestado, comprovante de comparecimento, certificado, etc.) ao seu gestor.
                </AlertDescription>
            </Alert>
          )}

          {/* Aviso Informativo para demais opções*/}
          {mightNeedMoreInfo && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Nota</AlertTitle>
                <AlertDescription>
                    O gestor poderá solicitar maiores detalhes ou documentações antes da análise do seu pedido.
                </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitJustificationMutation.isPending}>
              {submitJustificationMutation.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}