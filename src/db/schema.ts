// src/db/schema.ts

// Importe 'relations' do pacote principal "drizzle-orm"
import { relations } from "drizzle-orm";

import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const appointmentModalityEnum = pgEnum("appointment_modality", [
  "remoto",
  "presencial",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const patientSexEnum = pgEnum("patient_sex", [
  "male",
  "female",
  "outro",
]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

export const accountsTable = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verificationsTable = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_ات"),
});

export const clinicsTable = pgTable("clinics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phoneNumber: text("phone_number").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usersToClinicsTable = pgTable("users_to_clinics", {
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinicsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const doctorsTable = pgTable("doctors", {
  id: uuid("id").defaultRandom().primaryKey(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinicsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatarImageUrl: text("avatar_image_url"),
  availableFromWeekDay: integer("available_from_week_day").notNull(),
  availableToWeekDay: integer("available_to_week_day").notNull(),
  availableFromTime: time("available_from_time").notNull(),
  availableToTime: time("available_to_time").notNull(),
  specialty: text("specialty").notNull(),
  appointmentPriceInCents: integer("appointment_price_in_cents").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const patientsTable = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinicsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sex: patientSexEnum("sex").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const appointmentsTable = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: timestamp("date").notNull(),
  appointmentPriceInCents: integer("appointment_price_in_cents").notNull(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinicsTable.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patientsTable.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctorsTable.id, { onDelete: "cascade" }),
  status: appointmentStatusEnum("status").default("scheduled").notNull(),
  notes: text("notes"),
  modality: appointmentModalityEnum("modality").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// NOVA TABELA: blocked_dates para bloqueio de dias por médico
export const blockedDatesTable = pgTable(
  "blocked_dates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinicsTable.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorsTable.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      unq: uniqueIndex("blocked_date_unique").on(table.doctorId, table.date),
    };
  },
);

// NOVA TABELA: ad_hoc_available_dates para disponibilidade excepcional por médico
export const adHocAvailableDatesTable = pgTable(
  "ad_hoc_available_dates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinicsTable.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorsTable.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      unq: uniqueIndex("ad_hoc_available_date_unique").on(
        table.doctorId,
        table.date,
      ),
    };
  },
);

// NOVA TABELA: blocked_time_slots para bloquear horários específicos por médico
export const blockedTimeSlotsTable = pgTable(
  "blocked_time_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinicsTable.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorsTable.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(), // A data específica do bloqueio (apenas a data, sem a hora)
    time: text("time").notNull(), // O horário específico do bloqueio (ex: "09:00", "13:30")
    reason: text("reason"), // Opcional: Motivo do bloqueio do horário
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      unq: uniqueIndex("blocked_time_slot_unique").on(
        table.doctorId,
        table.date,
        table.time,
      ),
    };
  },
);

// =========================================================================
// RELATIONS - Definições de Relações (Usando 'any' para os helpers como último recurso)
// =========================================================================

// Usaremos 'any' para os helpers para contornar o erro de 'Relations'.
// Se 'relations' der 'not defined', adicione 'import { relations } from "drizzle-orm";' no topo.
export const usersTableRelations = relations(usersTable, (helpers: any) => ({
  usersToClinics: helpers.many(usersToClinicsTable),
}));

export const usersToClinicsTableRelations = relations(
  usersToClinicsTable,
  (helpers: any) => ({
    user: helpers.one(usersTable, {
      fields: [usersToClinicsTable.userId],
      references: [usersTable.id],
    }),
    clinic: helpers.one(clinicsTable, {
      fields: [usersToClinicsTable.clinicId],
      references: [clinicsTable.id],
    }),
  }),
);

export const clinicsTableRelations = relations(
  clinicsTable,
  (helpers: any) => ({
    doctors: helpers.many(doctorsTable),
    patients: helpers.many(patientsTable),
    appointments: helpers.many(appointmentsTable),
    usersToClinics: helpers.many(usersToClinicsTable),
  }),
);

export const doctorsTableRelations = relations(
  doctorsTable,
  (helpers: any) => ({
    clinic: helpers.one(clinicsTable, {
      fields: [doctorsTable.clinicId],
      references: [clinicsTable.id],
    }),
    appointments: helpers.many(appointmentsTable),
    blockedDates: helpers.many(blockedDatesTable),
    adHocAvailableDates: helpers.many(adHocAvailableDatesTable),
    blockedTimeSlots: helpers.many(blockedTimeSlotsTable), // Adiciona relação
  }),
);

export const patientsTableRelations = relations(
  patientsTable,
  (helpers: any) => ({
    clinic: helpers.one(clinicsTable, {
      fields: [patientsTable.clinicId],
      references: [clinicsTable.id],
    }),
    appointments: helpers.many(appointmentsTable),
  }),
);

export const appointmentsTableRelations = relations(
  appointmentsTable,
  (helpers: any) => ({
    clinic: helpers.one(clinicsTable, {
      fields: [appointmentsTable.clinicId],
      references: [clinicsTable.id],
    }),
    patient: helpers.one(patientsTable, {
      fields: [appointmentsTable.patientId],
      references: [patientsTable.id],
    }),
    doctor: helpers.one(doctorsTable, {
      fields: [appointmentsTable.doctorId],
      references: [doctorsTable.id],
    }),
  }),
);

export const blockedDatesTableRelations = relations(
  blockedDatesTable,
  (helpers: any) => ({
    clinic: helpers.one(clinicsTable, {
      fields: [blockedDatesTable.clinicId],
      references: [clinicsTable.id],
    }),
    doctor: helpers.one(doctorsTable, {
      fields: [blockedDatesTable.doctorId],
      references: [doctorsTable.id],
    }),
  }),
);

export const adHocAvailableDatesTableRelations = relations(
  adHocAvailableDatesTable,
  (helpers: any) => ({
    clinic: helpers.one(clinicsTable, {
      fields: [adHocAvailableDatesTable.clinicId],
      references: [clinicsTable.id],
    }),
    doctor: helpers.one(doctorsTable, {
      fields: [adHocAvailableDatesTable.doctorId],
      references: [doctorsTable.id],
    }),
  }),
);

export const blockedTimeSlotsTableRelations = relations(
  blockedTimeSlotsTable,
  (helpers: any) => ({
    clinic: helpers.one(clinicsTable, {
      fields: [blockedTimeSlotsTable.clinicId],
      references: [clinicsTable.id],
    }),
    doctor: helpers.one(doctorsTable, {
      fields: [blockedTimeSlotsTable.doctorId],
      references: [doctorsTable.id],
    }),
  }),
);
