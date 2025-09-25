import { departments, users, timeRecords, justifications, hourBank, functions, employmentTypes, justificationTypes, passwordResetRequests, type Department, type InsertDepartment, type User, type InsertUser, type TimeRecord, type InsertTimeRecord, type Justification, type InsertJustification, type HourBank, type InsertHourBank, type Function, type InsertFunction, type EmploymentType, type InsertEmploymentType, type JustificationType, type InsertJustificationType, type PasswordResetRequest, type InsertPasswordResetRequest } from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, between } from "drizzle-orm"; 
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { eachDayOfInterval, getDay, format} from 'date-fns';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Department methods
  getDepartment(id: number): Promise<Department | undefined>;
  getAllDepartments(showInactive?: boolean): Promise<Department[]>;
  getAllDepartmentsForAdmin(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  toggleDepartmentStatus(id: number, status: boolean): Promise<Department | undefined>;
  
  // Function methods
  getAllFunctions(showInactive?: boolean): Promise<Function[]>;
  getAllFunctionsForAdmin(): Promise<Function[]>;
  createFunction(func: InsertFunction): Promise<Function>;
  updateFunction(id: number, func: Partial<InsertFunction>): Promise<Function | undefined>;
  toggleFunctionStatus(id: number, status: boolean): Promise<Function | undefined>;
  
  // Employment Type methods
  getAllEmploymentTypes(showInactive?: boolean): Promise<EmploymentType[]>;
  getAllEmploymentTypesForAdmin(): Promise<EmploymentType[]>;
  createEmploymentType(type: InsertEmploymentType): Promise<EmploymentType>;
  updateEmploymentType(id: number, type: Partial<InsertEmploymentType>): Promise<EmploymentType | undefined>;
  toggleEmploymentTypeStatus(id: number, status: boolean): Promise<EmploymentType | undefined>;

  // Justification Type methods
  getJustificationType(id: number): Promise<JustificationType | undefined>;
  getJustificationTypeByName(name: string): Promise<JustificationType | undefined>;
  getAllJustificationTypes(showInactive?: boolean): Promise<JustificationType[]>;
  getAllJustificationTypesForAdmin(): Promise<JustificationType[]>;
  createJustificationType(type: InsertJustificationType): Promise<JustificationType>;
  updateJustificationType(id: number, type: Partial<InsertJustificationType>): Promise<JustificationType | undefined>;
  toggleJustificationTypeStatus(id: number, status: boolean): Promise<JustificationType | undefined>;
    
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByCpf(cpf: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllEmployees(departmentId?: number): Promise<(User & { department: Department | null })[]>;
  getAllUsers(): Promise<(User & { department: Department | null; function: Function | null; employmentType: EmploymentType | null })[]>;

  // Time record methods
  getTimeRecordById(id: number): Promise<TimeRecord | undefined>;
  getTimeRecord(userId: number, date: string): Promise<TimeRecord | undefined>;
  createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord>;
  updateTimeRecord(id: number, record: Partial<InsertTimeRecord>): Promise<TimeRecord | undefined>;
  getTimeRecordsForUser(userId: number, startDate: string, endDate: string): Promise<TimeRecord[]>;
  getAllTimeRecordsForDate(date: string, departmentId?: number): Promise<(TimeRecord & { user: User })[]>;

  // Justification methods
  createJustification(justification: InsertJustification): Promise<Justification>;
  createBulkJustifications(data: { userIds: number[], date: string, type: string, reason: string, managerId: number }): Promise<{ count: number }>;
  getJustificationById(id: number): Promise<(Justification & { user: User }) | undefined>;
  getJustificationsForUser(userId: number): Promise<Justification[]>;
  getJustificationsForUserByDateRange(userId: number, startDate: string, endDate: string): Promise<Justification[]>;
  getPendingJustifications(departmentId?: number): Promise<(Justification & { user: User })[]>;
  approveJustification(id: number, approverId: number, approved: boolean): Promise<Justification | undefined>;

  // Hour bank methods
  getHourBank(userId: number, month: string): Promise<HourBank | undefined>;
  createOrUpdateHourBank(hourBank: InsertHourBank): Promise<HourBank>;
  calculateHourBank(userId: number, startDate: string, endDate: string): Promise<Partial<HourBank>>;

  // Password reset methods
  getPasswordResetRequest(id: number): Promise<PasswordResetRequest | undefined>;
  createPasswordResetRequest(request: InsertPasswordResetRequest): Promise<PasswordResetRequest>;
  getPendingPasswordResetRequests(): Promise<PasswordResetRequest[]>;
  resolvePasswordResetRequest(id: number, resolverId: number): Promise<PasswordResetRequest | undefined>;
  cancelPasswordResetRequest(id: number): Promise<PasswordResetRequest | undefined>;

  sessionStore: any;
}

export class DatabaseStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Department Methods
  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department || undefined;
  }

  async getAllDepartments(showInactive: boolean = false): Promise<Department[]> {
    if (showInactive) {
      return await db.select().from(departments);
    }
    return await db.select().from(departments).where(eq(departments.isActive, true));
  }

  async getAllDepartmentsForAdmin(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async createDepartment(data: InsertDepartment): Promise<Department> {
    const [newItem] = await db.insert(departments).values(data).returning();
    return newItem;
  }

  async updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updatedItem] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return updatedItem;
  }
  
  async toggleDepartmentStatus(id: number, status: boolean): Promise<Department | undefined> {
    const [item] = await db.update(departments).set({ isActive: status }).where(eq(departments.id, id)).returning();
    return item;
  }

  // Justification types methods
  async getJustificationType(id: number): Promise<JustificationType | undefined> {
    const [justificationType] = await db.select().from(justificationTypes).where(eq(justificationTypes.id, id));
    return justificationType || undefined;
  }

  async getJustificationTypeByName(name: string): Promise<JustificationType | undefined> {
    const [justificationType] = await db.select().from(justificationTypes).where(eq(justificationTypes.name, name));
    return justificationType || undefined;
  }

  async getAllJustificationTypes(showInactive: boolean = false): Promise<JustificationType[]> {
    if (showInactive) {
      return await db.select().from(justificationTypes);
    }
    return await db.select().from(justificationTypes).where(eq(justificationTypes.isActive, true));
  }

  async getAllJustificationTypesForAdmin(): Promise<JustificationType[]> {
    return await db.select().from(justificationTypes);
  }

  async createJustificationType(data: InsertJustificationType): Promise<JustificationType> {
    const [newItem] = await db.insert(justificationTypes).values(data).returning();
    return newItem;
  }

  async updateJustificationType(id: number, data: Partial<InsertJustificationType>): Promise<JustificationType | undefined> {
    const [updatedItem] = await db.update(justificationTypes).set(data).where(eq(justificationTypes.id, id)).returning();
    return updatedItem;
  }

  async toggleJustificationTypeStatus(id: number, status: boolean): Promise<JustificationType | undefined> {
    const [item] = await db.update(justificationTypes).set({ isActive: status }).where(eq(justificationTypes.id, id)).returning();
    return item;
  }

  // Function methods
  async getAllFunctions(showInactive = false): Promise<Function[]> {
    if (showInactive) {
      return await db.select().from(functions);
    }
    return await db.select().from(functions).where(eq(functions.isActive, true));
  }

  async getAllFunctionsForAdmin(): Promise<Function[]> {
    return await db.select().from(functions);
  }

  async createFunction(data: InsertFunction): Promise<Function> {
    const [newItem] = await db.insert(functions).values(data).returning();
    return newItem;
  }

  async updateFunction(id: number, data: Partial<InsertFunction>): Promise<Function | undefined> {
    const [updatedItem] = await db.update(functions).set(data).where(eq(functions.id, id)).returning();
    return updatedItem;
  }

  async toggleFunctionStatus(id: number, status: boolean): Promise<Function | undefined> {
    const [item] = await db.update(functions).set({ isActive: status }).where(eq(functions.id, id)).returning();
    return item;
  }
  // Employment type methods
  async getAllEmploymentTypes(showInactive = false): Promise<EmploymentType[]> {
    if (showInactive) {
      return await db.select().from(employmentTypes);
    }
    return await db.select().from(employmentTypes).where(eq(employmentTypes.isActive, true));
  }
  
  async getAllEmploymentTypesForAdmin(): Promise<EmploymentType[]> {
    return await db.select().from(employmentTypes);
  }

  async createEmploymentType(data: InsertEmploymentType): Promise<EmploymentType> {
    const [newItem] = await db.insert(employmentTypes).values(data).returning();
    return newItem;
  }

  async updateEmploymentType(id: number, data: Partial<InsertEmploymentType>): Promise<EmploymentType | undefined> {
    const [updatedItem] = await db.update(employmentTypes).set(data).where(eq(employmentTypes.id, id)).returning();
    return updatedItem;
  }

  async toggleEmploymentTypeStatus(id: number, status: boolean): Promise<EmploymentType | undefined> {
    const [item] = await db.update(employmentTypes).set({ isActive: status }).where(eq(employmentTypes.id, id)).returning();
    return item;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByCpf(cpf: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.cpf, cpf));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateUser)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllEmployees(departmentId?: number): Promise<(User & { department: Department | null })[]> {
    const conditions = [
      eq(users.status, "active"),
      eq(users.role, "employee"),
    ];

    if (departmentId) {
      conditions.push(eq(users.departmentId, departmentId));
    }
    
    return await db
      .select()
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(and(...conditions))
      .then(results => results.map(result => ({
        ...result.users,
        department: result.departments
      })));
  }

  async getAllUsers(): Promise<(User & { department: Department | null; function: Function | null; employmentType: EmploymentType | null })[]> {
    const results = await db
      .select()
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(functions, eq(users.functionId, functions.id))
      .leftJoin(employmentTypes, eq(users.employmentTypeId, employmentTypes.id));
    
    return results.map(result => ({
      ...result.users,
      department: result.departments,
      function: result.functions,
      employmentType: result.employment_types
    }));
  }

  // Time record methods
  async getTimeRecordById(id: number): Promise<TimeRecord | undefined> {
    const [record] = await db
      .select()
      .from(timeRecords)
      .where(eq(timeRecords.id, id));
    return record;
  }

  async getTimeRecord(userId: number, date: string): Promise<TimeRecord | undefined> {
    const [record] = await db
      .select()
      .from(timeRecords)
      .where(and(eq(timeRecords.userId, userId), eq(timeRecords.date, date)));
    return record || undefined;
  }

  async createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord> {
    const [timeRecord] = await db
      .insert(timeRecords)
      .values({
        ...record,
        updatedAt: new Date(),
      })
      .returning();
    return timeRecord;
  }

  async updateTimeRecord(id: number, record: Partial<InsertTimeRecord>): Promise<TimeRecord | undefined> {
    const [timeRecord] = await db
      .update(timeRecords)
      .set({
        ...record,
        updatedAt: new Date(),
      })
      .where(eq(timeRecords.id, id))
      .returning();
    return timeRecord || undefined;
  }

  async getTimeRecordsForUser(userId: number, startDate: string, endDate: string): Promise<TimeRecord[]> {
    let conditions = [
        eq(timeRecords.userId, userId),
        between(timeRecords.date, startDate, endDate)
    ];
    
    return await db
      .select()
      .from(timeRecords)
      .where(and(...conditions))
      .orderBy(asc(timeRecords.date));
  }

  async getAllTimeRecordsForDate(date: string, departmentId?: number): Promise<(TimeRecord & { user: User })[]> {
    const conditions = [eq(timeRecords.date, date)];

    if (departmentId) {
        conditions.push(eq(users.departmentId, departmentId));
    }

    return await db
      .select()
      .from(timeRecords)
      .innerJoin(users, eq(timeRecords.userId, users.id))
      .where(and(...conditions))
      .then(results => results.map(result => ({
        ...result.time_records,
        user: result.users
      })));
  }

  // Justifications Methods
  async createJustification(justification: InsertJustification): Promise<Justification> {
    const [newJustification] = await db
      .insert(justifications)
      .values(justification)
      .returning();
    return newJustification;
  }

  async createBulkJustifications(data: { userIds: number[], date: string, type: string, reason: string, managerId: number }): Promise<{ count: number }> {
    const { userIds, date, type, reason, managerId } = data;
  
    const justificationType = await this.getJustificationTypeByName(type);
    const abona_horas = justificationType?.abona_horas || false;
  
    const justificationsToInsert = userIds.map(userId => ({
      userId,
      date,
      type,
      reason,
      abona_horas,
      status: "approved" as const,
      approvedBy: managerId,
      approvedAt: new Date(),
    }));
  
    if (justificationsToInsert.length === 0) {
      return { count: 0 };
    }
  
    const result = await db.insert(justifications).values(justificationsToInsert);
    return { count: result.rowCount };
  }

  async getJustificationById(id: number): Promise<(Justification & { user: User }) | undefined> {
    const [result] = await db
      .select()
      .from(justifications)
      .innerJoin(users, eq(justifications.userId, users.id))
      .where(eq(justifications.id, id));
    
    return result ? { ...result.justifications, user: result.users } : undefined;
  }

  async getJustificationsForUser(userId: number): Promise<Justification[]> {
    return await db
      .select()
      .from(justifications)
      .where(eq(justifications.userId, userId))
      .orderBy(desc(justifications.createdAt));
  }

  async getJustificationsForUserByDateRange(userId: number, startDate: string, endDate: string): Promise<Justification[]> {
    return await db
      .select()
      .from(justifications)
      .where(and(
        eq(justifications.userId, userId),
        between(justifications.date, startDate, endDate)
      ));
  }

  async getPendingJustifications(departmentId?: number): Promise<(Justification & { user: User })[]> {
    const conditions = [eq(justifications.status, "pending")];

    if (departmentId) {
      conditions.push(eq(users.departmentId, departmentId));
    }
    const results = await db
      .select()
      .from(justifications)
      .innerJoin(users, eq(justifications.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(justifications.createdAt))

    return results.map(result => ({
      ...result.justifications,
      user: result.users
    }));
  }

  async approveJustification(id: number, approverId: number, approved: boolean): Promise<Justification | undefined> {
    const [justification] = await db
      .update(justifications)
      .set({
        status: approved ? "approved" : "rejected",
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(justifications.id, id))
      .returning();
    return justification || undefined;
  }

  async getHourBank(userId: number, month: string): Promise<HourBank | undefined> {
    const [hourBankRecord] = await db
      .select()
      .from(hourBank)
      .where(and(eq(hourBank.userId, userId), eq(hourBank.month, month)));
    return hourBankRecord || undefined;
  }

  async createOrUpdateHourBank(hourBankData: InsertHourBank): Promise<HourBank> {
    const existing = await this.getHourBank(hourBankData.userId, hourBankData.month);
    
    if (existing) {
      const [updated] = await db
        .update(hourBank)
        .set({
          ...hourBankData,
          updatedAt: new Date(),
        })
        .where(eq(hourBank.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(hourBank)
        .values(hourBankData)
        .returning();
      return created;
    }
  }

  async calculateHourBank(userId: number, startDate: string, endDate: string): Promise<Partial<HourBank>> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const records = await this.getTimeRecordsForUser(userId, startDate, endDate);
    const approvedJustifications = (await this.getJustificationsForUserByDateRange(userId, startDate, endDate))
        .filter(j => j.status === 'approved');
    const abonadas = (await this.getJustificationsForUserByDateRange(userId, startDate, endDate))
        .filter(j => j.status === 'approved' && j.abona_horas);
    const holidays = approvedJustifications.filter(j => j.type === 'holiday');

    let workedHours = 0;
    records.forEach(record => {
      if (record.totalHours) {
        workedHours += parseFloat(record.totalHours);
      }
    });

    let abonoHours = 0;
    abonadas.forEach(justification => {
        const recordExists = records.some(r => r.date === justification.date);
        if (!recordExists) {
            abonoHours += parseFloat(user.dailyWorkHours);
        }
    });

    workedHours += abonoHours;

    const workingDays = this.getWorkingDaysInPeriod(startDate, endDate, holidays); 
    const expectedHours = workingDays * parseFloat(user.dailyWorkHours);
    const balance = workedHours - expectedHours;

    return {
      expectedHours: expectedHours.toString(),
      workedHours: workedHours.toString(),
      balance: balance.toString(),
    };
  }

  private getWorkingDaysInPeriod(startDate: string, endDate: string, holidays: Justification[]): number {
    const interval = {
      start: new Date(`${startDate}T12:00:00Z`),
      end: new Date(`${endDate}T12:00:00Z`)
    };
    const allDays = eachDayOfInterval(interval);
    const holidayDates = holidays.map(h => h.date);
    let workingDays = 0;

    allDays.forEach(day => {
      const dayOfWeek = getDay(day);
      const dateString = format(day, 'yyyy-MM-dd');
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidayDates.includes(dateString)) {
        workingDays++;
      }
    });

    return workingDays;
  }
  
  async getFunction(id: number): Promise<Function | undefined> {
    const [func] = await db.select().from(functions).where(eq(functions.id, id));
    return func || undefined;
  }

  async getEmploymentType(id: number): Promise<EmploymentType | undefined> {
    const [type] = await db.select().from(employmentTypes).where(eq(employmentTypes.id, id));
    return type || undefined;
  }

  // Password reset methods
  async getPasswordResetRequest(id: number): Promise<PasswordResetRequest | undefined> {
    const [request] = await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.id, id));
    return request;
  }

  async createPasswordResetRequest(insertRequest: InsertPasswordResetRequest): Promise<PasswordResetRequest> {
    const [request] = await db
      .insert(passwordResetRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async getPendingPasswordResetRequests(): Promise<PasswordResetRequest[]> {
    return await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.status, "pending"));
  }

  async resolvePasswordResetRequest(id: number, resolverId: number): Promise<PasswordResetRequest | undefined> {
    const [request] = await db
      .update(passwordResetRequests)
      .set({ 
        status: "resolved",
        resolvedBy: resolverId,
        resolvedAt: new Date()
      })
      .where(eq(passwordResetRequests.id, id))
      .returning();
    return request || undefined;
  }

  async cancelPasswordResetRequest(id: number): Promise<PasswordResetRequest | undefined> {
    const [request] = await db
      .update(passwordResetRequests)
      .set({ status: "canceled" })
      .where(eq(passwordResetRequests.id, id))
      .returning();
    return request || undefined;
  }
}

export const storage = new DatabaseStorage();