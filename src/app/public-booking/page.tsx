"use client";

import { CalendarDays, Clock, Stethoscope, User, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { createBooking } from "./actions";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  availableFromWeekDay: number;
  availableToWeekDay: number;
  availableFromTime: string;
  availableToTime: string;
  appointmentPriceInCents: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function BookingPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    sex: "",
  });

  // Fetch doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Generate time slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      generateTimeSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const response = await fetch("/api/doctors");
      const data = await response.json();
      setDoctors(data);

      // If only one doctor, pre-select them
      if (data.length === 1) {
        setSelectedDoctor(data[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar médicos:", error);
      setError("Erro ao carregar médicos. Tente novamente.");
    }
  };

  const generateTimeSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      const response = await fetch("/api/available-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          date: selectedDate.toISOString().split("T")[0],
        }),
      });
      const slots = await response.json();
      setAvailableSlots(slots);
      setSelectedTime(""); // Reset selected time
    } catch (error) {
      setError("Erro ao carregar horários disponíveis.");
      console.error("Erro ao carregar horários disponíveis.", error);
    }
  };

  const isDateAvailable = (date: Date) => {
    if (!selectedDoctor) return false;

    const dayOfWeek = date.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      date >= today &&
      dayOfWeek >= selectedDoctor.availableFromWeekDay &&
      dayOfWeek <= selectedDoctor.availableToWeekDay
    );
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(""); // Clear error when user types
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Nome é obrigatório";
    if (!formData.email.trim()) return "Email é obrigatório";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return "Email inválido";
    if (!formData.phoneNumber.trim()) return "Telefone é obrigatório";
    if (!/^\d+$/.test(formData.phoneNumber.replace(/\D/g, "")))
      return "Telefone deve conter apenas números";
    if (!formData.sex) return "Sexo é obrigatório";
    if (!selectedDoctor) return "Selecione um médico";
    if (!selectedDate) return "Selecione uma data";
    if (!selectedTime) return "Selecione um horário";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await createBooking({
        patient: {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phoneNumber: formData.phoneNumber.replace(/\D/g, ""),
          sex: formData.sex as "male" | "female",
        },
        appointment: {
          doctorId: selectedDoctor!.id,
          date: selectedDate!.toISOString().split("T")[0],
          time: selectedTime,
        },
      });

      if (result.success) {
        router.push(`/booking/confirmation?id=${result.appointmentId}`);
      } else {
        setError(result.error || "Erro ao criar agendamento. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Agendar Consulta
          </h1>
          <p className="text-gray-600">
            Cadastre-se e agende sua consulta em um só lugar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Patient Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Preencha seus dados para criar seu cadastro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Sexo *</Label>
                  <Select
                    value={formData.sex}
                    onValueChange={(value) => handleInputChange("sex", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Appointment Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Agendamento da Consulta
              </CardTitle>
              <CardDescription>
                Escolha o médico, data e horário para sua consulta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Doctor Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Médico *
                </Label>
                <Select
                  value={selectedDoctor?.id || ""}
                  onValueChange={(value) => {
                    const doctor = doctors.find((d) => d.id === value);
                    setSelectedDoctor(doctor || null);
                    setSelectedDate(undefined);
                    setSelectedTime("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{doctor.name}</span>
                          <span className="text-sm text-gray-500">
                            {doctor.specialty}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDoctor && (
                  <p className="text-sm text-gray-600">
                    Valor da consulta: R${" "}
                    {(selectedDoctor.appointmentPriceInCents / 100).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Date Selection */}
              {selectedDoctor && (
                <div className="space-y-2">
                  <Label>Data da Consulta *</Label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => !isDateAvailable(date)}
                      className="rounded-md border"
                    />
                  </div>
                </div>
              )}

              {/* Time Selection */}
              {selectedDoctor && selectedDate && availableSlots.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horário *
                  </Label>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        type="button"
                        variant={
                          selectedTime === slot.time ? "default" : "outline"
                        }
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className="h-10"
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDoctor &&
                selectedDate &&
                availableSlots.length === 0 && (
                  <p className="py-4 text-center text-gray-500">
                    Nenhum horário disponível para esta data
                  </p>
                )}
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full px-8 md:w-auto"
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  Agendando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Confirmar Agendamento
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
