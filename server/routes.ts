import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { generateMonthlyReportPDF } from "./pdf-generator";
import { insertTimeRecordSchema, insertJustificationSchema, insertDepartmentSchema, insertUserSchema, insertFunctionSchema, insertEmploymentTypeSchema, insertJustificationTypeSchema, type InsertUser } from "../shared/schema";
import { z } from "zod";
import { format, startOfMonth, subMonths, addDays, isBefore, differenceInDays } from 'date-fns';

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireManagerOrAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso de gestor ou administrador requerido." });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // --- Admin Routes ---

  // Users
  app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
        const { password, ...userDataFromRequest } = req.body;

        const validatedData = insertUserSchema.omit({ password: true }).parse(userDataFromRequest);

        const existingUserByCpf = await storage.getUserByCpf(validatedData.cpf);
        if (existingUserByCpf) {
          return res.status(409).json({ message: `O CPF ${validatedData.cpf} já está em uso.` });
        }
        const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
        if (existingUserByUsername) {
          return res.status(409).json({ message: `O nome de usuário "${validatedData.username}" já está em uso.` });
        }

        const tempPassword = validatedData.cpf.replace(/\D/g, '').substring(0, 6);
        const hashedPassword = await hashPassword(tempPassword);

        const newUser = await storage.createUser({
            ...validatedData,
            password: hashedPassword,
        });

        res.status(201).json({ user: newUser, tempPassword });

        } catch (error) {
          if (error instanceof z.ZodError) {
              return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
          }
          next(error);
        }
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { password, ...userData } = req.body;

        let dataToUpdate: Partial<InsertUser> = {};

        // Adiciona a atualização de senha ao objeto, se fornecida
        if (password && typeof password === 'string' && password.length >= 6) {
            dataToUpdate.password = await hashPassword(password);
            dataToUpdate.mustChangePassword = true;
        } else if (password) {
            return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
        }

        // Valida e processa outros dados do usuário, mesclando com o objeto existente
        if (Object.keys(userData).length > 0) {
            const validatedData = insertUserSchema.omit({ password: true }).partial().parse(userData);

            if (validatedData.cpf) {
                const existingUser = await storage.getUserByCpf(validatedData.cpf);
                if (existingUser && existingUser.id !== id) {
                    return res.status(409).json({ message: `O CPF ${validatedData.cpf} já pertence a outro usuário.` });
                }
            }
            if (validatedData.username) {
                const existingUser = await storage.getUserByUsername(validatedData.username);
                if (existingUser && existingUser.id !== id) {
                    return res.status(409).json({ message: `O nome de usuário "${validatedData.username}" já pertence a outro usuário.` });
                }
            }
            dataToUpdate = { ...dataToUpdate, ...validatedData };
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: "Nenhum dado para atualizar." });
        }

        const updatedUser = await storage.updateUser(id, dataToUpdate);
        if (!updatedUser) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }
        res.json(updatedUser);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
        }
        next(error);
    }
  });


  // Departments
  app.get("/api/admin/departments", requireAdmin, async (req, res) => {
    const showInactive = req.query.inactive === 'true';
    res.json(await storage.getAllDepartments(showInactive));
  });

  app.post("/api/admin/departments", requireAdmin, async (req, res, next) => {
    try {
      const newDepartment = await storage.createDepartment(req.body);
      res.status(201).json(newDepartment);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/departments/:id", requireAdmin, async (req, res, next) => {
    try {
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const updatedDepartment = await storage.updateDepartment(Number(req.params.id), req.body);
      res.json(updatedDepartment);
    } catch (error) {
      if (error instanceof z.ZodError){
        return res.status(400).json({message: "Dados inválidos", errors: error.errors});
      }
      next(error);
    }
  });

  app.put("/api/admin/departments/:id/toggle", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    res.json(await storage.toggleDepartmentStatus(id, status));
  });

  // Functions
  app.get("/api/admin/functions", requireAdmin, async (req, res) => {
    const showInactive = req.query.inactive === 'true';
    res.json(await storage.getAllFunctions(showInactive));
  });

  app.post("/api/admin/functions", requireAdmin, async (req, res, next) => {
    try {
      const newFunction = await storage.createFunction(req.body);
      res.status(201).json(newFunction);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/functions/:id", requireAdmin, async (req, res, next) => {
    try {
      const validatedData = insertFunctionSchema.partial().parse(req.body);
      const updatedFunction = await storage.updateFunction(Number(req.params.id), req.body);
      res.json(updatedFunction);
    } catch (error) {
      if (error instanceof z.ZodError){
        return res.status(400).json({message: "Dados inválidos", errors: error.errors});
      }
      next(error);
    }
  });

  app.put("/api/admin/functions/:id/toggle", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    res.json(await storage.toggleFunctionStatus(id, status));
  });

  // Employment Types
  app.get("/api/admin/employment-types", requireAdmin, async (req, res) => {
    const showInactive = req.query.inactive === 'true';
    res.json(await storage.getAllEmploymentTypes(showInactive));
  });

  app.post("/api/admin/employment-types", requireAdmin, async (req, res, next) => {
    try {
      const newType = await storage.createEmploymentType(req.body);
      res.status(201).json(newType);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/employment-types/:id", requireAdmin, async (req, res, next) => {
    try {
      const validatedData = insertEmploymentTypeSchema.partial().parse(req.body);
      const updatedType = await storage.updateEmploymentType(Number(req.params.id), req.body);
      res.json(updatedType);
    } catch (error) {
      if (error instanceof z.ZodError){
        return res.status(400).json({message: "Dados inválidos", errors: error.errors});
      }
      next(error);
    }
  });

  app.put("/api/admin/employment-types/:id/toggle", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    res.json(await storage.toggleEmploymentTypeStatus(id, status));
  });

  // Justification Types
  app.get("/api/admin/justification-types", requireAdmin, async (req, res) => {
    const showInactive = req.query.inactive === 'true';
    res.json(await storage.getAllJustificationTypes(showInactive));
  });

  app.post("/api/admin/justification-types", requireAdmin, async (req, res, next) => {
    try {
      const validatedData = insertJustificationTypeSchema.parse(req.body);
      const newType = await storage.createJustificationType(validatedData);
      res.status(201).json(newType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        return res.status(409).json({ message: "Já existe um tipo de justificativa com este nome" });
      }
      next(error);
    }
  });

  app.put("/api/admin/justification-types/:id", requireAdmin, async (req, res, next) => {
    try {
      const validatedData = insertJustificationTypeSchema.partial().parse(req.body);
      const updatedType = await storage.updateJustificationType(Number(req.params.id), validatedData);
      if (!updatedType) {
        return res.status(404).json({ message: "Tipo de justificativa não encontrado" });
      }
      res.json(updatedType);
    } catch (error) {
      if (error instanceof z.ZodError){
        return res.status(400).json({message: "Dados inválidos", errors: error.errors});
      }
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        return res.status(409).json({ message: "Já existe um tipo de justificativa com este nome" });
      }
      next(error);
    }
  });

  app.put("/api/admin/justification-types/:id/toggle", requireAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = z.object({ status: z.boolean() }).parse(req.body);
      const result = await storage.toggleJustificationTypeStatus(id, status);
      if (!result) {
        return res.status(404).json({ message: "Tipo de justificativa não encontrado" });
      }
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      next(error);
    }
  });

  // Password Reset
  app.get("/api/admin/password-reset-requests", requireAdmin, async (req, res, next) => {
    try {
      const requests = await storage.getPendingPasswordResetRequests();
      res.json(requests);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/password-reset/:requestId/resolve", requireAdmin, async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const adminId = req.user.id;
      const { newPassword } = req.body;

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
      }

      const request = await storage.getPasswordResetRequest(requestId);
      if (!request || request.status !== 'pending') {
          return res.status(404).json({ message: "Solicitação não encontrada ou já resolvida." });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(request.userId, { password: hashedPassword, mustChangePassword: true });
      await storage.resolvePasswordResetRequest(requestId, adminId);

      res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch (error) {
      next(error);
    }
  });

  // --- Public / User Routes ---

  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/api/justification-types", requireAuth, async (req, res) => {
    res.json(await storage.getAllJustificationTypes(false)); // Only active types
  });


  app.post("/api/user/change-password", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { newPassword } = req.body;

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
      }

      const hashedPassword = await hashPassword(newPassword);

      const updatedUser = await storage.updateUser(userId, {
        password: hashedPassword,
        mustChangePassword: false
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  // Time Records
  app.get("/api/time-records/today", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];
      const record = await storage.getTimeRecord(userId, today);
      res.json(record || null);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/time-records", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const month = req.query.month;

      if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Formato de mês inválido. Use AAAA-MM." });
      }

      const referenceDate = new Date(`${month}-02T12:00:00Z`);
      const startDate = format(startOfMonth(referenceDate), 'yyyy-MM-dd');
      const endDate = format(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0), 'yyyy-MM-dd');

      const records = await storage.getTimeRecordsForUser(userId, startDate, endDate);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/time-records", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];

      let timeRecord = await storage.getTimeRecord(userId, today);

      if (!timeRecord) {
        timeRecord = await storage.createTimeRecord({
          userId,
          date: today,
          entry1: new Date().toTimeString().slice(0, 5),
        });
      } else {
        const now = new Date().toTimeString().slice(0, 5);
        const lastTime = timeRecord.exit2 || timeRecord.entry2 || timeRecord.exit1 || timeRecord.entry1;

        if (lastTime) {
          const lastTimeMinutes = parseInt(lastTime.split(':')[0]) * 60 + parseInt(lastTime.split(':')[1]);
          const nowMinutes = parseInt(now.split(':')[0]) * 60 + parseInt(now.split(':')[1]);

          if (nowMinutes - lastTimeMinutes < 60) {
            return res.status(400).json({
              message: "É necessário aguardar pelo menos 1 hora entre os registros."
            });
          }
        }

        if (!timeRecord.exit1) {
          timeRecord = await storage.updateTimeRecord(timeRecord.id, { exit1: now });
        } else if (!timeRecord.entry2) {
          timeRecord = await storage.updateTimeRecord(timeRecord.id, { entry2: now });
        } else if (!timeRecord.exit2) {
          timeRecord = await storage.updateTimeRecord(timeRecord.id, { exit2: now });

          const entry1Minutes = parseInt(timeRecord.entry1!.split(':')[0]) * 60 + parseInt(timeRecord.entry1!.split(':')[1]);
          const exit1Minutes = parseInt(timeRecord.exit1!.split(':')[0]) * 60 + parseInt(timeRecord.exit1!.split(':')[1]);
          const entry2Minutes = parseInt(timeRecord.entry2!.split(':')[0]) * 60 + parseInt(timeRecord.entry2!.split(':')[1]);
          const exit2Minutes = parseInt(now.split(':')[0]) * 60 + parseInt(now.split(':')[1]);

          const totalMinutes = (exit1Minutes - entry1Minutes) + (exit2Minutes - entry2Minutes);
          const totalHours = totalMinutes / 60;

          timeRecord = await storage.updateTimeRecord(timeRecord.id, {
            totalHours: totalHours.toFixed(2)
          });
        } else {
          return res.status(400).json({ message: "All time slots for today are already filled" });
        }
      }

      res.json(timeRecord);
    } catch (error) {
      next(error);
    }
  });

  // Justifications
  app.post("/api/justifications", requireAuth, async (req, res, next) => {
    try {
      const validatedData = insertJustificationSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const justification = await storage.createJustification(validatedData);
      res.status(201).json(justification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/justifications", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const justifications = await storage.getJustificationsForUser(userId);
      res.json(justifications);
    } catch (error) {
      next(error);
    }
  });

  // --- Manager Endpoints ---
  
  app.get("/api/manager/employees", requireManagerOrAdmin, async (req, res, next) => {
    try {
      const departmentId = req.user.role === 'admin' ? undefined : req.user.departmentId;

      if (req.user.role === 'manager' && !departmentId) {
        return res.status(400).json({ message: "O gestor não está associado a um departamento." });
      }

      const employees = await storage.getAllEmployees(departmentId);
      res.json(employees);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/manager/time-records/:date", requireManagerOrAdmin, async (req, res, next) => {
    try {
      const date = req.params.date;
      const departmentId = req.user.role === 'admin' ? undefined : req.user.departmentId;

      if (req.user.role === 'manager' && !departmentId) {
        return res.status(400).json({ message: "O gestor não está associado a um departamento." });
      }
      const records = await storage.getAllTimeRecordsForDate(date, departmentId);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/manager/justifications", requireManagerOrAdmin, async (req, res, next) => {
    try {
      const manager = req.user;
      const { userId, date, type, reason } = req.body;

      const employee = await storage.getUser(userId);
      if (!employee || (manager.role !== 'admin' && employee.departmentId !== manager.departmentId)) {
        return res.status(403).json({ message: "Acesso negado." });
      }

      const abona_horas = ["vacation", "health-problems", "family-issue", "training"].includes(type);

      const newJustification = await storage.createJustification({
        userId,
        date,
        type,
        reason,
        abona_horas,
        status: "approved",
        approvedBy: manager.id,
        approvedAt: new Date(),
      });

      res.status(201).json(newJustification);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/manager/justifications/pending", requireManagerOrAdmin, async (req, res, next) => {
    try {
      const managerDepartmentId = req.user.role === 'admin' ? undefined : req.user.departmentId;

      if (req.user.role === 'manager' && !managerDepartmentId) {
        return res.status(400).json({
          message: "O gestor não está associado a um departamento."
        });
      }

      const justifications = await storage.getPendingJustifications(managerDepartmentId);
      res.json(justifications);
    } catch (error) {
      next(error);
    }

  });

  app.post("/api/manager/justifications/:id/approve", requireManagerOrAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { approved } = req.body;
      const manager = req.user;

      const justificationToApprove = await storage.getJustificationById(id);
      if (!justificationToApprove) {
        return res.status(404).json({ message: "Justificativa não encontrada." });
      }

      if (manager.role === 'manager' && justificationToApprove.user.departmentId !== manager.departmentId) {
          return res.status(403).json({ message: "Você não tem permissão para aprovar esta justificativa." });
      }

      const justification = await storage.approveJustification(id, manager.id, approved);

      if (!justification) {
        return res.status(404).json({ message: "Justificativa não encontrada ao tentar aprovar." });
      }

      res.json(justification);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/manager/time-records/:id", requireManagerOrAdmin, async (req, res, next) => {
    try {
      const recordId = parseInt(req.params.id);
      const { entry1, exit1, entry2, exit2 } = req.body;

      const originalRecord = await storage.getTimeRecordById(recordId);
      if (!originalRecord) {
        return res.status(404).json({ message: "Registro de ponto não encontrado." });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const recordDate = new Date(`${originalRecord.date}T12:00:00Z`);

      if (recordDate.getTime() === today.getTime()) {
        return res.status(403).json({ message: "Não é permitido ajustar registros do dia atual." });
      }

      const firstDayOfLastMonth = startOfMonth(subMonths(today, 1));
      if (isBefore(recordDate, firstDayOfLastMonth)) {
        return res.status(403).json({ message: "Não é permitido ajustar registros de meses anteriores ao mês passado." });
      }

      const updatedRecord = await storage.updateTimeRecord(recordId, {
        entry1, exit1, entry2, exit2, isAdjusted: true,
      });

      res.json(updatedRecord);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/manager/hour-bank/:userId/:month", requireManagerOrAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const month = req.params.month;
      if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Formato de mês inválido. Use AAAA-MM." });
      }
      const referenceDate = new Date(`${month}-02T12:00:00Z`);
      const startDate = format(startOfMonth(referenceDate), 'yyyy-MM-dd');
      const endDate = format(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0), 'yyyy-MM-dd');

      const hourBank = await storage.calculateHourBank(userId, startDate, endDate);
      res.json(hourBank);
    } catch (error) {
      next(error);
    }
  });

  // --- Report Generation ---

  const handleReportGeneration = async (userId: number, month: string, startDate: string, endDate: string) => {
    const user = await storage.getUser(userId);
    if (!user) throw new Error("Usuário não encontrado.");

    const timeRecords = await storage.getTimeRecordsForUser(userId, startDate, endDate);
    const approvedJustifications = (await storage.getJustificationsForUserByDateRange(userId, startDate, endDate))
      .filter(j => j.status === 'approved');

    const hourBank = await storage.calculateHourBank(userId, startDate, endDate);

    return await generateMonthlyReportPDF({
      user,
      timeRecords,
      month,
      approvedJustifications,
      startDate,
      endDate,
      hourBank
    });
  };

  const reportValidationSchema = z.object({
    userId: z.string().regex(/^\d+$/),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  app.get("/api/manager/report/monthly", requireManagerOrAdmin, async (req, res, next) => {
    try {
      const validation = reportValidationSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ message: "Parâmetros inválidos.", errors: validation.error.flatten() });
      }
      const { userId, month, startDate, endDate } = validation.data;

      // Validação do intervalo de datas
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (differenceInDays(end, start) > 31) {
        return res.status(400).json({ message: "O intervalo entre as datas não pode exceder 31 dias." });
      }

      const pdfBuffer = await handleReportGeneration(parseInt(userId), month, startDate, endDate);
      const user = await storage.getUser(parseInt(userId));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio-${user?.username}-${month}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/user/report/monthly", requireAuth, async (req, res, next) => {
    try {
      const validation = reportValidationSchema.omit({ userId: true }).safeParse(req.query);
       if (!validation.success) {
        return res.status(400).json({ message: "Parâmetros inválidos.", errors: validation.error.flatten() });
      }
      const { month, startDate, endDate } = validation.data;
      const userId = req.user.id;

      // Validação do intervalo de datas
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (differenceInDays(end, start) > 31) {
        return res.status(400).json({ message: "O intervalo entre as datas não pode exceder 31 dias." });
      }

      const pdfBuffer = await handleReportGeneration(userId, month, startDate, endDate);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio-${req.user.username}-${month}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}