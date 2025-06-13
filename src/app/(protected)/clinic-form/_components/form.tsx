// src/app/(protected)/clinic-form/_components/form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createClinic } from "@/actions/create-clinic";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{0,2})?(\d{0,5})?(\d{0,4})?$/);

  if (!match) return phone;

  const parts = [];
  if (match[1]) parts.push(`(${match[1]}`);
  if (match[2]) parts.push(`) ${match[2]}`);
  if (match[3]) parts.push(`-${match[3]}`);

  return parts.join(" ");
};

const clinicFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
  address: z.string().trim().optional(),
  phoneNumber: z
    .string()
    .trim()
    .min(1, { message: "Telefone é obrigatório." })
    .refine((val) => /^\d{10,11}$/.test(val.replace(/\D/g, "")), {
      message: "Telefone inválido (apenas números, 10 ou 11 dígitos).",
    }),
  email: z
    .string()
    .trim()
    .email({ message: "E-mail inválido" })
    .min(1, { message: "E-mail é obrigatório." }),
});

interface ClinicFormProps {
  onClose?: () => void; // <<< NOVO: Callback para fechar o modal
}

const ClinicForm = ({ onClose }: ClinicFormProps) => {
  // <<< Recebe onClose
  const form = useForm<z.infer<typeof clinicFormSchema>>({
    resolver: zodResolver(clinicFormSchema),
    defaultValues: {
      name: "",
      address: "",
      phoneNumber: "",
      email: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof clinicFormSchema>) => {
    try {
      const result = await createClinic({
        // <<< createClinic agora retorna um resultado
        name: data.name,
        address: data.address || null,
        phoneNumber: data.phoneNumber.replace(/\D/g, ""),
        email: data.email,
      });

      if (result.success) {
        // <<< TRATAMENTO DE SUCESSO AQUI
        toast.success("Clínica criada com sucesso!"); // Toast de sucesso
        onClose?.(); // Chama o callback para fechar o modal
      } else {
        // <<< TRATAMENTO DE ERRO DO RESULTADO DA ACTION
        toast.error(result.error || "Erro ao criar clínica.");
      }
    } catch (error) {
      // <<< TRATAMENTO DE ERRO INESPERADO
      if (isRedirectError(error)) {
        return;
      }
      console.error("Erro inesperado ao criar clínica:", error);
      toast.error("Erro inesperado ao criar clínica.");
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    const cleanedValue = value.replace(/\D/g, "");
    form.setValue("phoneNumber", cleanedValue, { shouldValidate: true });
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Clínica</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome da clínica" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Digite o endereço da clínica"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="(XX) XXXXX-XXXX"
                    value={formatPhoneNumber(field.value)}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Digite o e-mail da clínica"
                    type="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Criar clínica
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};

export default ClinicForm;
