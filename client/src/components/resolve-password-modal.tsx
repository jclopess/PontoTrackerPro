import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type PasswordResetRequest } from "@shared/schema";

interface ResolvePasswordResetModalProps {
  request: PasswordResetRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ResolvePasswordResetModal({ request, open, onOpenChange, onSuccess }: ResolvePasswordResetModalProps) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  const resolvePasswordResetMutation = useMutation({
    mutationFn: ({ requestId, password }: { requestId: number; password: string; }) =>
      apiRequest("POST", `/api/admin/password-reset/${requestId}/resolve`, { newPassword: password }),
    onSuccess: () => {
      toast({ title: "Senha redefinida com sucesso!" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao redefinir senha", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha precisa ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "Por favor, digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    resolvePasswordResetMutation.mutate({ requestId: request.id, password: newPassword });
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir Senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para o usuário com CPF: {request.cpf}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={resolvePasswordResetMutation.isPending}>
              {resolvePasswordResetMutation.isPending ? "Salvando..." : "Salvar Nova Senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
